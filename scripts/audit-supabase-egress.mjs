import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
}

console.error("Read-only audit: this command downloads sampled database rows and lists Storage objects, so run it sparingly.");
const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const database = {};
const tableAudits = [
  ["publishedCatalog", "published_catalog", "content_id,content_type,parent_id,payload", 1000],
  ["vocabularyItems", "vocabulary_items", "*", 1000],
  ["vocabularyExamples", "vocabulary_examples", "*", 1000],
  ["examQuestions", "exam_questions", "*", 1000],
];

for (const [metricName, table, columns, limit] of tableAudits) {
  const { data, count, error } = await supabase
    .from(table)
    .select(columns, { count: "exact" })
    .limit(limit);
  if (error) throw new Error(`${table}: ${error.message}`);
  const sampleRows = data?.length ?? 0;
  const sampleJsonBytes = Buffer.byteLength(JSON.stringify(data ?? []));
  database[metricName] = metricName === "publishedCatalog"
    ? { rows: count ?? sampleRows, jsonBytes: sampleJsonBytes }
    : { rows: count ?? sampleRows, sampleRows, sampleJsonBytes };
}

const { data: shellRows, error: shellError } = await supabase.rpc(
  "get_published_catalog_shells",
);
database.publishedCatalogShells = shellError
  ? { available: false, errorCode: shellError.code ?? "UNKNOWN" }
  : {
      available: true,
      rows: shellRows?.length ?? 0,
      jsonBytes: Buffer.byteLength(JSON.stringify(shellRows ?? [])),
    };

const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
if (bucketError) throw new Error(`storage buckets: ${bucketError.message}`);
const storage = {};
for (const bucket of buckets ?? []) {
  const objects = await listObjects(bucket.name);
  storage[bucket.name] = {
    objects: objects.length,
    totalBytes: objects.reduce((sum, object) => sum + object.size, 0),
    largestObjectBytes: Math.max(0, ...objects.map((object) => object.size)),
  };
}

console.log(JSON.stringify({
  schemaVersion: 2,
  capturedAt: new Date().toISOString(),
  environment: "production",
  database,
  storage,
  notes: [
    "Database byte counts are compact JSON response sizes measured client-side, not billed-byte totals.",
    "Use the Supabase Usage dashboard as the source of truth for billed egress.",
  ],
}, null, 2));

async function listObjects(bucket, path = "") {
  const output = [];
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await supabase.storage.from(bucket).list(path, {
      limit: 100,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw new Error(`${bucket}/${path}: ${error.message}`);
    if (!data?.length) break;
    for (const item of data) {
      const itemPath = path ? `${path}/${item.name}` : item.name;
      if (item.id) output.push({ path: itemPath, size: Number(item.metadata?.size ?? 0) });
      else output.push(...await listObjects(bucket, itemPath));
    }
    if (data.length < 100) break;
  }
  return output;
}
