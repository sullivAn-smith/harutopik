import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = new URL("../outputs/exam-import-template/", import.meta.url);
await fs.mkdir(outputDir, { recursive: true });

const headers = [
  "section", "number", "instruction", "question", "secondary_question", "underlined_text",
  "passage", "option_1", "option_2", "option_3", "option_4", "correct_option", "explanation",
];
const locked = "🔒 KHÓA";

function isPassageOwner(level, section, position) {
  if (section !== "reading") return false;
  if (level === "topik_i") return ![20, 22, 24, 26, 30, 32, 34, 36, 38, 40].includes(position);
  return ![20, 22, 24, 43, 45, 47, 49, 50].includes(position);
}

function permissions(level, section, position) {
  const topikI = level === "topik_i";
  const listening = section === "listening";
  const reading = section === "reading";
  const passageOwner = isPassageOwner(level, section, position);
  return {
    prompt: !topikI || (listening
      ? position >= 29
      : ![30, 32, 34, 36, 38, 40].includes(position)),
    secondary: topikI
      ? reading && position === 29
      : reading && ((position >= 39 && position <= 41) || position === 46),
    underline: !topikI && reading && [3, 4, 42, 48].includes(position),
    passage: reading && passageOwner && (topikI
      ? position >= 19 && position !== 33
      : !((position <= 10) || (position >= 25 && position <= 27) || (position >= 39 && position <= 41))),
  };
}

function makeRows(level, section) {
  const count = level === "topik_i"
    ? section === "listening" ? 30 : 40
    : 50;
  return Array.from({ length: count }, (_, offset) => {
    const position = offset + 1;
    const permission = permissions(level, section, position);
    return [
      section,
      position,
      locked,
      permission.prompt ? "" : locked,
      permission.secondary ? "" : locked,
      permission.underline ? "" : locked,
      permission.passage ? "" : locked,
      "", "", "", "",
      1,
      "",
    ];
  });
}

function fileName(level, section) {
  return `mau-nhap-${level === "topik_i" ? "topik-i" : "topik-ii"}-${section === "listening" ? "nghe" : "doc"}`;
}

for (const level of ["topik_i", "topik_ii"]) {
  for (const section of ["listening", "reading"]) {
    const workbook = Workbook.create();
    const sectionLabel = section === "listening" ? "NGHE" : "ĐỌC";
    const levelLabel = level === "topik_i" ? "TOPIK I" : "TOPIK II";
    const sheet = workbook.worksheets.add(sectionLabel);
    const rows = makeRows(level, section);
    const lastRow = rows.length + 4;

    sheet.showGridLines = false;
    sheet.getRange("A1:M1").merge();
    sheet.getRange("A1").values = [[`${levelLabel} · ${sectionLabel} · MẪU NHẬP ĐỀ HARUTOPIK`]];
    sheet.getRange("A2:M2").merge();
    sheet.getRange("A2").values = [[
      "Giữ nguyên section, number và tên cột. Chỉ điền ô màu trắng; ô KHÓA sẽ bị bỏ qua. "
      + "Chọn đáp án đúng 1–4 ở cột correct_option; khi nhập lên website đáp án sẽ tự được tích. "
      + "Ảnh và audio tiếp tục tải trực tiếp trên website nên không có trong file này.",
    ]];
    sheet.getRange("A4:M4").values = [headers];
    sheet.getRangeByIndexes(4, 0, rows.length, headers.length).values = rows;
    sheet.freezePanes.freezeRows(4);
    sheet.freezePanes.freezeColumns(2);

    sheet.getRange("A1:M1").format = {
      fill: "#10243E",
      font: { color: "#FFFFFF", bold: true, size: 18 },
      rowHeight: 34,
    };
    sheet.getRange("A2:M2").format = {
      fill: "#E6F7F5",
      font: { color: "#0F4C5C", bold: true },
      wrapText: true,
      rowHeight: 60,
    };
    sheet.getRange("A4:M4").format = {
      fill: "#12B8A6",
      font: { color: "#FFFFFF", bold: true },
      wrapText: true,
      rowHeight: 42,
      borders: { preset: "all", style: "thin", color: "#D1E4E8" },
    };
    sheet.getRangeByIndexes(4, 0, rows.length, headers.length).format = {
      wrapText: true,
      verticalAlignment: "center",
      borders: { preset: "all", style: "thin", color: "#DCE7EB" },
    };
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
      for (let colIndex = 0; colIndex < headers.length; colIndex += 1) {
        if (rows[rowIndex][colIndex] === locked) {
          sheet.getCell(rowIndex + 4, colIndex).format = {
            fill: "#E5E7EB",
            font: { color: "#6B7280", italic: true },
          };
        }
      }
    }
    sheet.getRange(`L5:L${lastRow}`).dataValidation = { rule: { type: "list", values: [1, 2, 3, 4] } };
    sheet.getRange(`L5:L${lastRow}`).format = { fill: "#ECFDF5", font: { color: "#047857", bold: true } };
    sheet.getRange("A:A").format.columnWidth = 13;
    sheet.getRange("B:B").format.columnWidth = 9;
    for (const column of ["C", "D", "E", "F", "G", "M"]) sheet.getRange(`${column}:${column}`).format.columnWidth = column === "G" ? 42 : 26;
    for (const column of ["H", "I", "J", "K"]) sheet.getRange(`${column}:${column}`).format.columnWidth = 20;
    sheet.getRange("L:L").format.columnWidth = 15;

    const baseName = fileName(level, section);
    const output = await SpreadsheetFile.exportXlsx(workbook);
    await output.save(fileURLToPath(new URL(`${baseName}.xlsx`, outputDir)));
    const preview = await workbook.render({ sheetName: sectionLabel, range: "A1:M14", scale: 0.9, format: "png" });
    await fs.writeFile(new URL(`${baseName}-preview.png`, outputDir), new Uint8Array(await preview.arrayBuffer()));
    const inspection = await workbook.inspect({ kind: "sheet,region", range: "A1:M9", maxChars: 2500 });
    console.log(inspection.ndjson);
    const formulaErrors = await workbook.inspect({
      kind: "match",
      searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
      options: { useRegex: true, maxResults: 100 },
      summary: "final formula error scan",
    });
    console.log(formulaErrors.ndjson);
  }
}
