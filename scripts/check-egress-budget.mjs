import { readFile } from "node:fs/promises";

const reportPath = process.env.EGRESS_AUDIT_FILE
  ?? "docs/egress/baseline-2026-08-19.json";
const [budgets, report] = await Promise.all([
  readJson("config/egress-budgets.json"),
  readJson(reportPath),
]);
const violations = [];

checkMaximum("published_catalog rows", report.database.publishedCatalog.rows, budgets.publishedCatalog.maxRows);
checkMaximum("published_catalog JSON bytes", report.database.publishedCatalog.jsonBytes, budgets.publishedCatalog.maxJsonBytes);
if (budgets.publishedCatalogShells && report.schemaVersion >= 2) {
  const shells = report.database.publishedCatalogShells;
  if (!shells?.available) {
    violations.push("published catalog shells: RPC unavailable; apply migration 202608190080");
  } else {
    checkMaximum("published catalog shell rows", shells.rows, budgets.publishedCatalogShells.maxRows);
    checkMaximum("published catalog shell JSON bytes", shells.jsonBytes, budgets.publishedCatalogShells.maxJsonBytes);
  }
}

for (const [name, budget] of Object.entries(budgets.tables)) {
  const metric = report.database[name];
  if (!metric?.sampleRows) {
    violations.push(`${name}: missing sampled row metrics`);
    continue;
  }
  checkMaximum(
    `${name} average JSON bytes/row`,
    metric.sampleJsonBytes / metric.sampleRows,
    budget.maxAverageJsonBytesPerRow,
  );
}

for (const [bucket, budget] of Object.entries(budgets.storage)) {
  const metric = report.storage[bucket];
  if (!metric) {
    violations.push(`${bucket}: missing storage metrics`);
    continue;
  }
  checkMaximum(`${bucket} largest object`, metric.largestObjectBytes, budget.maxObjectBytes);
}

if (violations.length) {
  console.error(`Egress budget exceeded in ${reportPath}:\n${violations.join("\n")}`);
  process.exit(1);
}
console.log(`Egress budget passed using ${reportPath}.`);

function checkMaximum(label, actual, maximum) {
  if (!Number.isFinite(actual)) violations.push(`${label}: invalid metric`);
  else if (actual > maximum) violations.push(`${label}: ${Math.ceil(actual)} > ${maximum} bytes`);
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}
