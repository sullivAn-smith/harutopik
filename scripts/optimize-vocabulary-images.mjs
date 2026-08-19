import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import process from "node:process";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

const apply = process.argv.includes("--apply");
const bucket = "vocabulary-images";
const outputDirectory = process.env.IMAGE_OPTIMIZATION_OUTPUT_DIR ?? "/tmp";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing Supabase production configuration.");

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data: rows, error } = await supabase
  .from("vocabulary_items")
  .select("id,image_url")
  .not("image_url", "is", null)
  .order("id");
if (error) throw error;

const manifest = {
  schemaVersion: 1,
  mode: apply ? "apply" : "dry-run",
  createdAt: new Date().toISOString(),
  bucket,
  entries: [],
};

for (const row of rows ?? []) {
  const oldUrl = row.image_url;
  if (!oldUrl) continue;
  const response = await fetch(oldUrl);
  if (!response.ok) throw new Error(`${row.id}: download failed (${response.status})`);
  const source = Buffer.from(await response.arrayBuffer());
  const metadata = await sharp(source).metadata();
  const belongsToBucket = isBucketUrl(oldUrl);
  const optimized = belongsToBucket
    ? await sharp(source)
        .rotate()
        .resize({
          width: 1120,
          height: 800,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 88, effort: 6, smartSubsample: true })
        .toBuffer()
    : source;
  const digest = createHash("sha256").update(source).digest("hex").slice(0, 20);
  const storagePath = `optimized/v1/${row.id}/${digest}.webp`;
  const publicUrl = supabase.storage.from(bucket).getPublicUrl(storagePath).data.publicUrl;
  const entry = {
    vocabularyId: row.id,
    oldUrl,
    newUrl: publicUrl,
    storagePath,
    sourceType: belongsToBucket ? "supabase-storage" : "external",
    action: !belongsToBucket
      ? "external-unchanged"
      : optimized.length >= source.length
        ? "skip-no-savings"
        : apply
          ? "replaced"
          : "would-replace",
    source: {
      bytes: source.length,
      width: metadata.width ?? null,
      height: metadata.height ?? null,
      format: metadata.format ?? null,
    },
    optimized: {
      bytes: optimized.length,
      reductionPercent: Number((100 * (1 - optimized.length / source.length)).toFixed(2)),
    },
    database: null,
  };

  if (apply && entry.action === "replaced") {
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, optimized, {
        cacheControl: "31536000",
        contentType: "image/webp",
        upsert: true,
      });
    if (uploadError) throw new Error(`${row.id}: upload failed: ${uploadError.message}`);
    const { data: database, error: replaceError } = await supabase.rpc(
      "replace_vocabulary_image_url",
      { p_vocabulary_id: row.id, p_old_url: oldUrl, p_new_url: publicUrl },
    );
    if (replaceError) throw new Error(`${row.id}: DB replacement failed: ${replaceError.message}`);
    entry.database = database;
  }
  manifest.entries.push(entry);
}

manifest.summary = {
  images: manifest.entries.length,
  storageImages: manifest.entries.filter((entry) => entry.sourceType === "supabase-storage").length,
  externalImages: manifest.entries.filter((entry) => entry.sourceType === "external").length,
  replacements: manifest.entries.filter((entry) => ["would-replace", "replaced"].includes(entry.action)).length,
  sourceBytes: manifest.entries
    .filter((entry) => entry.sourceType === "supabase-storage")
    .reduce((sum, entry) => sum + entry.source.bytes, 0),
  optimizedBytes: manifest.entries
    .filter((entry) => entry.sourceType === "supabase-storage")
    .reduce((sum, entry) => sum + Math.min(entry.source.bytes, entry.optimized.bytes), 0),
};
manifest.summary.reductionPercent = manifest.summary.sourceBytes
  ? Number((100 * (1 - manifest.summary.optimizedBytes / manifest.summary.sourceBytes)).toFixed(2))
  : 0;
const filename = `${outputDirectory}/haru-vocabulary-image-${apply ? "apply" : "dry-run"}-${Date.now()}.json`;
await writeFile(filename, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ ...manifest.summary, manifest: filename }));

function isBucketUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.pathname.includes(`/storage/v1/object/public/${bucket}/`);
  } catch {
    return false;
  }
}
