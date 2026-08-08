import type { ExamQuestionInput, ExamSection } from "@/lib/exams/types";

const requiredHeaders = [
  "section", "number", "instruction", "question", "option_1", "option_2",
  "option_3", "option_4", "correct_option", "explanation",
] as const;

const readingTypes = new Set(["standard", "fill_blank", "image_match", "practical_info", "same_topic", "main_idea", "sentence_order", "insert_sentence", "equivalent_expression", "title_match", "long_passage"]);

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
  const parsed = rows.slice(1).filter((row) => row.some((cell) => cell !== null && cell !== "")).map((row, rowIndex) => {
    const section = value(row, "section") as ExamSection;
    if (section !== "listening" && section !== "reading") {
      throw new Error(`Dòng ${rowIndex + 2}: section phải là listening hoặc reading.`);
    }
    const position = Number(value(row, "number"));
    const answer = Number(value(row, "correct_option"));
    const answerType = value(row, "answer_type") === "image" ? "image" as const : "text" as const;
    const rawReadingType = value(row, "reading_type") || "standard";
    if (!readingTypes.has(rawReadingType)) throw new Error(`Dòng ${rowIndex + 2}: reading_type không hợp lệ.`);
    if (!Number.isInteger(position) || position < 1) throw new Error(`Dòng ${rowIndex + 2}: number không hợp lệ.`);
    if (!Number.isInteger(answer) || answer < 1 || answer > 4) throw new Error(`Dòng ${rowIndex + 2}: correct_option phải từ 1 đến 4.`);
    const key = `${section}:${position}`;
    if (positions.has(key)) throw new Error(`Dòng ${rowIndex + 2}: số câu bị trùng trong phần ${section}.`);
    positions.add(key);
    const options = [1, 2, 3, 4].map((index) => value(row, `option_${index}`));
    const optionImages = [1, 2, 3, 4].map((index) => value(row, `option_image_${index}`));
    if (answerType === "image") {
      for (let index = 0; index < options.length; index += 1) options[index] ||= String(index + 1);
    }
    return {
      position,
      section,
      audioBlockKey: value(row, "audio_block"),
      readingType: rawReadingType as ExamQuestionInput["readingType"],
      passageBlockKey: value(row, "passage_group"),
      passage: value(row, "passage"),
      answerType,
      instruction: value(row, "instruction"),
      prompt: value(row, "question"),
      audioUrl: "",
      audioText: value(row, "audio_text"),
      imageUrl: value(row, "image_url"),
      playLimit: 1,
      options,
      optionImages,
      correctOption: answer,
      explanation: value(row, "explanation"),
    };
  });

  const passageGroups = new Map<string, Pick<ExamQuestionInput, "passage" | "imageUrl" | "readingType">>();
  for (const question of parsed) {
    if (question.section !== "reading" || !question.passageBlockKey) continue;
    const existing = passageGroups.get(question.passageBlockKey);
    passageGroups.set(question.passageBlockKey, {
      passage: existing?.passage || question.passage,
      imageUrl: existing?.imageUrl || question.imageUrl,
      readingType: existing?.readingType !== "standard"
        ? existing?.readingType ?? question.readingType
        : question.readingType,
    });
  }

  return parsed.map((question) => {
    if (question.section !== "reading" || !question.passageBlockKey) return question;
    const shared = passageGroups.get(question.passageBlockKey);
    return shared ? { ...question, ...shared } : question;
  });
}
