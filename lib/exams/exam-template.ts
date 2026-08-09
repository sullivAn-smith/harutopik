import type { ExamLevel, ExamQuestionInput, ExamReadingType, ExamSection } from "./types";

export type ExamWizardFlow = "single" | "shared" | "special";

export type ExamTemplateGroup = {
  id: string;
  level: ExamLevel;
  section: ExamSection;
  range: string;
  target: number;
  label: string;
  flow: ExamWizardFlow;
  answerType?: "text" | "image";
  readingTypes?: readonly ExamReadingType[];
};

export const examTemplateGroups: readonly ExamTemplateGroup[] = [
  { id: "i-l-1-6", level: "topik_i", section: "listening", range: "1–6", target: 6, label: "Nghe và chọn đáp án ảnh", flow: "special", answerType: "image" },
  { id: "i-l-7-10", level: "topik_i", section: "listening", range: "7–10", target: 4, label: "Hội thoại ngắn · câu đơn", flow: "single" },
  { id: "i-l-11-30", level: "topik_i", section: "listening", range: "11–30", target: 20, label: "Audio dùng chung · nhóm câu", flow: "shared" },
  { id: "i-r-1-15", level: "topik_i", section: "reading", range: "1–15", target: 15, label: "Từ vựng / ngữ pháp · câu đơn", flow: "single", readingTypes: ["fill_blank"] },
  { id: "i-r-16-21", level: "topik_i", section: "reading", range: "16–21", target: 6, label: "Tranh / thông báo / bảng", flow: "special", readingTypes: ["practical_info"] },
  { id: "i-r-22-24", level: "topik_i", section: "reading", range: "22–24", target: 3, label: "Sắp xếp câu", flow: "special", readingTypes: ["sentence_order"] },
  { id: "i-r-25-31", level: "topik_i", section: "reading", range: "25–31", target: 7, label: "Đoạn đọc đơn", flow: "single", readingTypes: ["main_idea"] },
  { id: "i-r-32-40", level: "topik_i", section: "reading", range: "32–40", target: 9, label: "Đoạn đọc chung · nhóm câu", flow: "shared", readingTypes: ["long_passage"] },
  { id: "ii-l-1-10", level: "topik_ii", section: "listening", range: "1–10", target: 10, label: "Audio đơn", flow: "single" },
  { id: "ii-l-11-20", level: "topik_ii", section: "listening", range: "11–20", target: 10, label: "Audio đơn có tranh / thông tin", flow: "special" },
  { id: "ii-l-21-36", level: "topik_ii", section: "listening", range: "21–36", target: 16, label: "Audio chung · nhóm 2 câu", flow: "shared" },
  { id: "ii-l-37-50", level: "topik_ii", section: "listening", range: "37–50", target: 14, label: "Audio dài · nhóm câu", flow: "shared" },
  { id: "ii-r-1-10", level: "topik_ii", section: "reading", range: "1–10", target: 10, label: "Từ vựng / ngữ pháp", flow: "single", readingTypes: ["fill_blank"] },
  { id: "ii-r-11-18", level: "topik_ii", section: "reading", range: "11–18", target: 8, label: "Quảng cáo / thông báo / biểu đồ", flow: "special", readingTypes: ["practical_info"] },
  { id: "ii-r-19-24", level: "topik_ii", section: "reading", range: "19–24", target: 6, label: "Sắp xếp câu", flow: "special", readingTypes: ["sentence_order"] },
  { id: "ii-r-25-27", level: "topik_ii", section: "reading", range: "25–27", target: 3, label: "Chèn câu vào đoạn", flow: "special", readingTypes: ["insert_sentence"] },
  { id: "ii-r-28-38", level: "topik_ii", section: "reading", range: "28–38", target: 11, label: "Đoạn đọc đơn", flow: "single", readingTypes: ["main_idea"] },
  { id: "ii-r-39-50", level: "topik_ii", section: "reading", range: "39–50", target: 12, label: "Đoạn đọc dài · nhóm câu", flow: "shared", readingTypes: ["long_passage"] },
] as const;

function rangeOf(row: ExamTemplateGroup) {
  const [start, end] = row.range.split("–").map(Number);
  return { start, end };
}

export function buildExamSkeleton(level: ExamLevel): ExamQuestionInput[] {
  return examTemplateGroups.filter((row) => row.level === level).flatMap((row) => {
    const { start, end } = rangeOf(row);
    return Array.from({ length: end - start + 1 }, (_, offset) => {
      const position = start + offset;
      const sharedPair = row.flow === "shared" ? Math.floor(offset / 2) + 1 : null;
      const readingType = row.readingTypes?.[0] ?? "standard";
      return {
        position,
        section: row.section,
        audioBlockKey: row.section === "listening" && sharedPair ? `${row.id}-audio-${sharedPair}` : "",
        readingType,
        passageBlockKey: row.section === "reading" && sharedPair ? `${row.id}-passage-${sharedPair}` : "",
        passage: "",
        answerType: row.answerType ?? "text",
        instruction: row.label,
        prompt: "",
        audioUrl: "",
        audioText: "",
        imageUrl: "",
        playLimit: 1,
        options: row.answerType === "image" ? ["Ảnh 1", "Ảnh 2", "Ảnh 3", "Ảnh 4"] : ["", "", "", ""],
        optionImages: ["", "", "", ""],
        correctOption: 1,
        explanation: "",
      } satisfies ExamQuestionInput;
    });
  });
}

export function completeExamSkeleton(level: ExamLevel, existing: ExamQuestionInput[]) {
  const byPosition = new Map(existing.map((question) => [`${question.section}:${question.position}`, question]));
  return buildExamSkeleton(level).map((slot) => {
    const saved = byPosition.get(`${slot.section}:${slot.position}`);
    if (!saved) return slot;
    return {
      ...saved,
      audioBlockKey: slot.audioBlockKey,
      readingType: slot.readingType,
      passageBlockKey: slot.passageBlockKey,
      answerType: slot.answerType,
      options: slot.answerType === "image" && saved.options.every((option) => !option.trim()) ? slot.options : saved.options,
    };
  });
}
