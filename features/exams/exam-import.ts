import type { ExamQuestionInput, ExamSection } from "@/lib/exams/types";

const requiredHeaders = [
  "section", "number", "instruction", "question", "option_1", "option_2",
  "option_3", "option_4", "correct_option", "explanation", "audio_text", "image_url",
] as const;

export function parseCsv(source: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '"') {
      if (quoted && source[index + 1] === '"') { cell += '"'; index += 1; }
      else quoted = !quoted;
    } else if (character === "," && !quoted) { row.push(cell.trim()); cell = ""; }
    else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && source[index + 1] === "\n") index += 1;
      row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); row = []; cell = "";
    } else cell += character;
  }
  row.push(cell.trim()); if (row.some(Boolean)) rows.push(row);
  return rows;
}

export function parseExamImportRows(rows: unknown[][]): ExamQuestionInput[] {
  if (rows.length < 2) throw new Error("File chưa có dữ liệu.");
  const headers = rows[0].map((cell) => String(cell ?? "").trim().toLowerCase());
  const missing = requiredHeaders.filter((header) => !headers.includes(header));
  if (missing.length) throw new Error(`Thiếu cột: ${missing.join(", ")}.`);
  const value = (row: unknown[], name: string) =>
    String(row[headers.indexOf(name)] ?? "").trim();
  const positions = new Set<string>();
  return rows.slice(1).filter((row) => row.some((cell) => cell !== null && cell !== "")).map((row, rowIndex) => {
    const section = value(row, "section") as ExamSection;
    if (section !== "listening" && section !== "reading") {
      throw new Error(`Dòng ${rowIndex + 2}: section phải là listening hoặc reading.`);
    }
    const position = Number(value(row, "number"));
    const answer = Number(value(row, "correct_option"));
    if (!Number.isInteger(position) || position < 1) throw new Error(`Dòng ${rowIndex + 2}: number không hợp lệ.`);
    if (!Number.isInteger(answer) || answer < 1 || answer > 4) throw new Error(`Dòng ${rowIndex + 2}: correct_option phải từ 1 đến 4.`);
    const key = `${section}:${position}`;
    if (positions.has(key)) throw new Error(`Dòng ${rowIndex + 2}: số câu bị trùng trong phần ${section}.`);
    positions.add(key);
    return {
      position,
      section,
      instruction: value(row, "instruction"),
      prompt: value(row, "question"),
      audioUrl: "",
      audioText: value(row, "audio_text"),
      imageUrl: value(row, "image_url"),
      playLimit: 1,
      options: [1, 2, 3, 4].map((index) => value(row, `option_${index}`)),
      correctOption: answer,
      explanation: value(row, "explanation"),
    };
  });
}
