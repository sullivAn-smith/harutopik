import fs from "node:fs";
import path from "node:path";

const [, , mode, input, outputPrefix] = process.argv;
const pageSize = 90;

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function writePages(lines) {
  const pages = Math.max(1, Math.ceil(lines.length / pageSize));
  for (let page = 0; page < pages; page += 1) {
    const pageLines = lines.slice(page * pageSize, (page + 1) * pageSize);
    const width = 1800;
    const lineHeight = 20;
    const height = Math.max(240, 70 + pageLines.length * lineHeight);
    const text = pageLines
      .map((line, index) => `<text x="20" y="${50 + index * lineHeight}" font-family="Menlo, monospace" font-size="14" fill="#10233f">${escapeXml(line)}</text>`)
      .join("\n");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<rect width="100%" height="100%" fill="#ffffff"/>
<text x="20" y="24" font-family="Menlo, monospace" font-size="13" fill="#5a6a82">Page ${page + 1}/${pages}</text>
${text}
</svg>`;
    fs.writeFileSync(`${outputPrefix}-${String(page + 1).padStart(3, "0")}.svg`, svg);
  }
}

if (mode === "--file") {
  writePages(fs.readFileSync(input, "utf8").split(/\r?\n/));
} else if (mode === "--list") {
  const ignored = new Set([".git", ".next", "node_modules", "test-results", "playwright-report"]);
  const files = [];
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (ignored.has(entry.name)) continue;
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(fullPath);
      else files.push(path.relative(input, fullPath));
    }
  }
  visit(input);
  writePages(files.sort());
} else {
  throw new Error("Usage: render-text-to-svg.mjs --file|--list INPUT OUTPUT_PREFIX");
}
