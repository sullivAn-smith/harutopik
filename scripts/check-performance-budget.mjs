import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";

const limits = {
  largestJavaScriptBytes: 900 * 1024,
  publicImageBytes: 1500 * 1024,
};

const violations = [];
const chunks = await listFiles(".next/static/chunks");
for (const file of chunks.filter((item) => item.endsWith(".js"))) {
  const size = (await stat(file)).size;
  if (size > limits.largestJavaScriptBytes) {
    violations.push(`${file}: ${size} bytes JS`);
  }
}

const publicFiles = await listFiles("public");
const sourceFiles = (
  await Promise.all(
    ["app", "components", "content", "features", "lib"].map(listFiles),
  )
).flat();
const sourceText = (
  await Promise.all(
    sourceFiles
      .filter((item) => /\.(ts|tsx|css)$/.test(item))
      .map((item) => readFile(item, "utf8")),
  )
).join("\n");
for (const file of publicFiles.filter((item) => /\.(png|jpe?g|webp)$/i.test(item))) {
  const publicPath = `/${file.slice("public/".length)}`;
  if (!sourceText.includes(publicPath)) continue;
  const size = (await stat(file)).size;
  if (size > limits.publicImageBytes) {
    violations.push(`${file}: ${size} bytes image`);
  }
}

if (violations.length > 0) {
  console.error(`Performance budget exceeded:\n${violations.join("\n")}`);
  process.exit(1);
}
console.log("Performance budget passed.");

async function listFiles(directory) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) output.push(...(await listFiles(path)));
    else output.push(path);
  }
  return output;
}
