import type { ExamQuestionInput, ExamSection } from "@/lib/exams/types";

const requiredHeaders = ["section", "number"] as const;

const headerAliases: Record<string, readonly string[]> = {
  section: ["section", "phan", "phần"],
  number: ["number", "so_cau", "số_câu"],
  instruction: ["instruction", "tieu_de", "tiêu_đề"],
  question: ["question", "cau_hoi_hien_thi", "câu_hỏi_hiển_thị"],
  secondary_question: ["secondary_question", "cau_hoi_rieng_2", "câu_hỏi_riêng_2"],
  underlined_text: ["underlined_text", "tu_gach_chan", "từ_gạch_chân"],
  passage: ["passage", "bai_doc", "bài_đọc"],
  audio_text: ["audio_text", "noi_dung_audio", "nội_dung_audio"],
  audio_url: ["audio_url"],
  image_url: ["image_url", "anh_de_url", "ảnh_đề_url"],
  correct_option: ["correct_option", "dap_an_dung", "đáp_án_đúng"],
  explanation: ["explanation", "giai_thich", "giải_thích"],
};

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
  const headerRowIndex = rows.findIndex((row) => {
    const normalized = row.map((cell) => String(cell ?? "").trim().toLowerCase());
    return normalized.includes("section") && normalized.includes("number");
  });
  if (headerRowIndex < 0) throw new Error("Không tìm thấy dòng tiêu đề có cột section và number.");
  const headers = rows[headerRowIndex].map((cell) => String(cell ?? "").trim().toLowerCase());
  const findHeaderIndex = (name: string) => {
    const aliases = headerAliases[name] ?? [name];
    return headers.findIndex((header) => aliases.includes(header));
  };
  const missing = requiredHeaders.filter((header) => findHeaderIndex(header) < 0);
  if (missing.length) throw new Error(`Thiếu cột: ${missing.join(", ")}.`);
  const value = (row: unknown[], name: string) => {
    const index = findHeaderIndex(name);
    const result = String(index >= 0 ? row[index] ?? "" : "").trim();
    return /(?:🔒\s*)?KHÓA/i.test(result) ? "" : result;
  };
  const positions = new Set<string>();
  const parsed = rows.slice(headerRowIndex + 1).filter((row) => row.some((cell) => cell !== null && cell !== "")).map((row, rowIndex) => {
    const rawSection = value(row, "section").toLowerCase();
    const section = (rawSection === "nghe" ? "listening" : rawSection === "đọc" || rawSection === "doc" ? "reading" : rawSection) as ExamSection;
    if (section !== "listening" && section !== "reading") {
      throw new Error(`Dòng ${rowIndex + headerRowIndex + 2}: section phải là listening hoặc reading.`);
    }
    const position = Number(value(row, "number"));
    const answer = Number(value(row, "correct_option") || "1");
    const answerType = value(row, "answer_type") === "image" ? "image" as const : "text" as const;
    const rawReadingType = value(row, "reading_type") || "standard";
    if (!readingTypes.has(rawReadingType)) throw new Error(`Dòng ${rowIndex + headerRowIndex + 2}: reading_type không hợp lệ.`);
    if (!Number.isInteger(position) || position < 1) throw new Error(`Dòng ${rowIndex + headerRowIndex + 2}: number không hợp lệ.`);
    if (!Number.isInteger(answer) || answer < 1 || answer > 4) throw new Error(`Dòng ${rowIndex + headerRowIndex + 2}: correct_option phải từ 1 đến 4.`);
    const key = `${section}:${position}`;
    if (positions.has(key)) throw new Error(`Dòng ${rowIndex + headerRowIndex + 2}: số câu bị trùng trong phần ${section}.`);
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
      audioUrl: value(row, "audio_url"),
      audioText: value(row, "secondary_question") || value(row, "audio_text"),
      underlinedText: value(row, "underlined_text"),
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
