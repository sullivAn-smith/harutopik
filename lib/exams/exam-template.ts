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
  sharedSize?: number;
  answerType?: "text" | "image";
  readingTypes?: readonly ExamReadingType[];
};

export const examTemplateGroups: readonly ExamTemplateGroup[] = [
  { id: "i-l-1-14", level: "topik_i", section: "listening", range: "1–14", target: 14, label: "Audio riêng từng câu", flow: "single" },
  { id: "i-l-15-16", level: "topik_i", section: "listening", range: "15–16", target: 2, label: "Audio riêng từng câu · 4 đáp án ảnh", flow: "single", answerType: "image" },
  { id: "i-l-17-24", level: "topik_i", section: "listening", range: "17–24", target: 8, label: "Audio riêng từng câu", flow: "single" },
  { id: "i-l-25-26", level: "topik_i", section: "listening", range: "25–26", target: 2, label: "Một audio chung cho câu 25–26", flow: "shared" },
  { id: "i-l-27-28", level: "topik_i", section: "listening", range: "27–28", target: 2, label: "Một audio chung cho câu 27–28", flow: "shared" },
  { id: "i-l-29-30", level: "topik_i", section: "listening", range: "29–30", target: 2, label: "Một audio chung cho câu 29–30", flow: "shared" },
  { id: "i-r-31-39", level: "topik_i", section: "reading", range: "1–9", target: 9, label: "Câu 31–39 · giữ nguyên form", flow: "single", readingTypes: ["fill_blank"] },
  { id: "i-r-40-42", level: "topik_i", section: "reading", range: "10–12", target: 3, label: "Câu 40–42 · ảnh đề + 4 đáp án chữ", flow: "special", readingTypes: ["practical_info"] },
  { id: "i-r-43-48", level: "topik_i", section: "reading", range: "13–18", target: 6, label: "Câu 43–48 · câu đơn", flow: "single", readingTypes: ["standard"] },
  { id: "i-r-49-50", level: "topik_i", section: "reading", range: "19–20", target: 2, label: "Câu 49–50 · chung bài đọc", flow: "shared", readingTypes: ["long_passage"] },
  { id: "i-r-51-52", level: "topik_i", section: "reading", range: "21–22", target: 2, label: "Câu 51–52 · chung bài đọc", flow: "shared", readingTypes: ["long_passage"] },
  { id: "i-r-53-54", level: "topik_i", section: "reading", range: "23–24", target: 2, label: "Câu 53–54 · chung bài đọc", flow: "shared", readingTypes: ["long_passage"] },
  { id: "i-r-55-56", level: "topik_i", section: "reading", range: "25–26", target: 2, label: "Câu 55–56 · chung bài đọc", flow: "shared", readingTypes: ["long_passage"] },
  { id: "i-r-57-58", level: "topik_i", section: "reading", range: "27–28", target: 2, label: "Câu 57–58 · nhập riêng từng câu", flow: "single", readingTypes: ["long_passage"] },
  { id: "i-r-59-60", level: "topik_i", section: "reading", range: "29–30", target: 2, label: "Câu 59–60 · chung bài đọc + tiêu đề", flow: "shared", readingTypes: ["long_passage"] },
  { id: "i-r-61-62", level: "topik_i", section: "reading", range: "31–32", target: 2, label: "Câu 61–62 · chung bài đọc", flow: "shared", readingTypes: ["long_passage"] },
  { id: "i-r-63-64", level: "topik_i", section: "reading", range: "33–34", target: 2, label: "Câu 63–64 · chung ảnh đề + tiêu đề", flow: "shared", readingTypes: ["practical_info"] },
  { id: "i-r-65-66", level: "topik_i", section: "reading", range: "35–36", target: 2, label: "Câu 65–66 · chung bài đọc", flow: "shared", readingTypes: ["long_passage"] },
  { id: "i-r-67-68", level: "topik_i", section: "reading", range: "37–38", target: 2, label: "Câu 67–68 · chung bài đọc", flow: "shared", readingTypes: ["long_passage"] },
  { id: "i-r-69-70", level: "topik_i", section: "reading", range: "39–40", target: 2, label: "Câu 69–70 · chung bài đọc", flow: "shared", readingTypes: ["long_passage"] },
  { id: "ii-l-1-3", level: "topik_ii", section: "listening", range: "1–3", target: 3, label: "Audio riêng · 4 đáp án ảnh", flow: "special", answerType: "image" },
  { id: "ii-l-4-20", level: "topik_ii", section: "listening", range: "4–20", target: 17, label: "Audio riêng · 4 đáp án chữ", flow: "single" },
  { id: "ii-l-21-50", level: "topik_ii", section: "listening", range: "21–50", target: 30, label: "Hai câu dùng chung một audio", flow: "shared" },
  { id: "ii-r-1-4", level: "topik_ii", section: "reading", range: "1–4", target: 4, label: "Từ vựng / ngữ pháp", flow: "single", readingTypes: ["fill_blank"] },
  { id: "ii-r-5-10", level: "topik_ii", section: "reading", range: "5–10", target: 6, label: "Ảnh đề + 4 đáp án chữ", flow: "special", readingTypes: ["practical_info"] },
  { id: "ii-r-11-12", level: "topik_ii", section: "reading", range: "11–12", target: 2, label: "Đoạn đọc đơn", flow: "single", readingTypes: ["main_idea"] },
  { id: "ii-r-13-15", level: "topik_ii", section: "reading", range: "13–15", target: 3, label: "Sắp xếp câu", flow: "special", readingTypes: ["sentence_order"] },
  { id: "ii-r-16-18", level: "topik_ii", section: "reading", range: "16–18", target: 3, label: "Điền nội dung vào đoạn", flow: "single", readingTypes: ["fill_blank"] },
  { id: "ii-r-19-20", level: "topik_ii", section: "reading", range: "19–20", target: 2, label: "Chung bài đọc", flow: "shared", readingTypes: ["long_passage"] },
  { id: "ii-r-21-22", level: "topik_ii", section: "reading", range: "21–22", target: 2, label: "Chung bài đọc", flow: "shared", readingTypes: ["long_passage"] },
  { id: "ii-r-23-24", level: "topik_ii", section: "reading", range: "23–24", target: 2, label: "Chung bài đọc", flow: "shared", readingTypes: ["long_passage"] },
  { id: "ii-r-25-27", level: "topik_ii", section: "reading", range: "25–27", target: 3, label: "Tiêu đề báo chí", flow: "single", readingTypes: ["main_idea"] },
  { id: "ii-r-28-31", level: "topik_ii", section: "reading", range: "28–31", target: 4, label: "Điền nội dung vào đoạn", flow: "single", readingTypes: ["insert_sentence"] },
  { id: "ii-r-32-38", level: "topik_ii", section: "reading", range: "32–38", target: 7, label: "Đọc và chọn nội dung đúng", flow: "single", readingTypes: ["main_idea"] },
  { id: "ii-r-39-41", level: "topik_ii", section: "reading", range: "39–41", target: 3, label: "Chèn câu vào vị trí thích hợp", flow: "single", readingTypes: ["insert_sentence"] },
  { id: "ii-r-42-43", level: "topik_ii", section: "reading", range: "42–43", target: 2, label: "Chung bài đọc", flow: "shared", readingTypes: ["long_passage"] },
  { id: "ii-r-44-45", level: "topik_ii", section: "reading", range: "44–45", target: 2, label: "Chung bài đọc", flow: "shared", readingTypes: ["long_passage"] },
  { id: "ii-r-46-47", level: "topik_ii", section: "reading", range: "46–47", target: 2, label: "Chung bài đọc", flow: "shared", readingTypes: ["long_passage"] },
  { id: "ii-r-48-50", level: "topik_ii", section: "reading", range: "48–50", target: 3, label: "Ba câu chung bài đọc", flow: "shared", sharedSize: 3, readingTypes: ["long_passage"] },
] as const;

export function getExamTemplateGroups(level: ExamLevel): readonly ExamTemplateGroup[] {
  return examTemplateGroups.filter((row) => row.level === level);
}

type FixedExamQuestionCopy = Partial<Pick<ExamQuestionInput, "instruction" | "prompt">>;

export function isTopikIBoxedReadingQuestion(
  level: ExamLevel,
  section: ExamSection,
  position: number,
) {
  return level === "topik_i" && section === "reading" && position >= 1 && position <= 9;
}

export function shouldHideTopikIReadingPassage(
  level: ExamLevel,
  section: ExamSection,
  position: number,
) {
  return level === "topik_i" && section === "reading" && position >= 1 && position <= 18;
}

/**
 * TOPIK I listening questions 1–28 always use the same official-style
 * instructions. Keeping them in the template prevents editors and imports
 * from having to re-enter (or accidentally change) this fixed copy per exam.
 */
export function getFixedExamQuestionCopy(
  level: ExamLevel,
  section: ExamSection,
  position: number,
): FixedExamQuestionCopy | null {
  if (isTopikIBoxedReadingQuestion(level, section, position)) {
    return {
      instruction: position <= 3
        ? "무엇에 대한 이야기입니까? 알맞은 것을 고르십시오."
        : "빈칸에 들어갈 가장 알맞은 것을 고르십시오.",
    };
  }

  if (level !== "topik_i" || section !== "listening" || position < 1 || position > 28) {
    return null;
  }

  if (position <= 4) {
    return { instruction: "다음을 듣고 물음에 맞는 대답을 고르십시오.", prompt: "" };
  }
  if (position <= 6) {
    return { instruction: "다음을 듣고 이어지는 말을 고르십시오.", prompt: "" };
  }
  if (position <= 10) {
    return { instruction: "여기는 어디입니까? 알맞은 것을 고르십시오.", prompt: "" };
  }
  if (position <= 14) {
    return { instruction: "다음은 무엇에 대해 말하고 있습니까? 알맞은 것을 고르십시오.", prompt: "" };
  }
  if (position <= 16) {
    return { instruction: "다음 대화를 듣고 알맞은 그림을 고르십시오.", prompt: "" };
  }
  if (position <= 21) {
    return { instruction: "다음을 듣고 대화 내용과 같은 것을 고르십시오.", prompt: "" };
  }
  if (position <= 24) {
    return { instruction: "다음을 듣고 여자의 중심 생각을 고르십시오.", prompt: "" };
  }
  if (position === 25) {
    return {
      instruction: "어떤 이야기를 하고 있는지 고르십시오.",
      prompt: "어떤 이야기를 하고 있는지 고르십시오.",
    };
  }
  if (position === 26) {
    return { instruction: "", prompt: "들은 내용과 같은 것을 고르십시오." };
  }
  if (position === 27) {
    return {
      instruction: "다음을 듣고 물음에 답하십시오.",
      prompt: "두 사람이 무엇에 대해 이야기를 하고 있는지 고르십시오.",
    };
  }
  return { instruction: "", prompt: "들은 내용과 같은 것을 고르십시오." };
}

export function applyFixedExamQuestionCopy(
  level: ExamLevel,
  question: ExamQuestionInput,
): ExamQuestionInput {
  const fixedCopy = getFixedExamQuestionCopy(level, question.section, question.position);
  return fixedCopy ? { ...question, ...fixedCopy } : question;
}

function rangeOf(row: ExamTemplateGroup) {
  const [start, end] = row.range.split("–").map(Number);
  return { start, end };
}

export function buildExamSkeleton(level: ExamLevel): ExamQuestionInput[] {
  return getExamTemplateGroups(level).flatMap((row) => {
    const { start, end } = rangeOf(row);
    return Array.from({ length: end - start + 1 }, (_, offset) => {
      const position = start + offset;
      const sharedPair = row.flow === "shared" ? Math.floor(offset / (row.sharedSize ?? 2)) + 1 : null;
      const readingType = row.readingTypes?.[0] ?? "standard";
      const question = {
        position,
        section: row.section,
        audioBlockKey: row.section === "listening" && sharedPair ? `${row.id}-audio-${sharedPair}` : "",
        readingType,
        passageBlockKey: row.section === "reading" && sharedPair ? `${row.id}-passage-${sharedPair}` : "",
        passage: "",
        answerType: row.answerType ?? "text",
        instruction: "",
        prompt: "",
        underlinedText: "",
        audioUrl: "",
        audioText: "",
        imageUrl: "",
        playLimit: 1,
        options: row.answerType === "image" ? ["Ảnh 1", "Ảnh 2", "Ảnh 3", "Ảnh 4"] : ["", "", "", ""],
        optionImages: ["", "", "", ""],
        correctOption: 1,
        explanation: "",
      } satisfies ExamQuestionInput;
      return applyFixedExamQuestionCopy(level, question);
    });
  });
}

export function completeExamSkeleton(level: ExamLevel, existing: ExamQuestionInput[]) {
  const byPosition = new Map(existing.map((question) => [`${question.section}:${question.position}`, question]));
  const generatedTemplateLabels = new Set([
    ...examTemplateGroups.map((group) => group.label),
    "Audio đơn",
    "Audio đơn có tranh / thông tin",
    "Audio chung · nhóm 2 câu",
    "Audio dài · nhóm câu",
    "Từ vựng / ngữ pháp",
    "Quảng cáo / thông báo / biểu đồ",
    "Sắp xếp câu",
    "Chèn câu vào đoạn",
    "Đoạn đọc dài · nhóm câu",
  ]);
  return buildExamSkeleton(level).map((slot) => {
    const saved = byPosition.get(`${slot.section}:${slot.position}`);
    if (!saved) return slot;
    const clearsReadingPassage = shouldHideTopikIReadingPassage(level, slot.section, slot.position);
    const normalized = {
      ...saved,
      audioBlockKey: slot.audioBlockKey,
      readingType: slot.readingType,
      passageBlockKey: slot.passageBlockKey,
      passage: clearsReadingPassage ? "" : saved.passage,
      answerType: slot.answerType,
      instruction: generatedTemplateLabels.has(saved.instruction) ? "" : saved.instruction,
      options: slot.answerType === "image" && saved.options.every((option) => !option.trim()) ? slot.options : saved.options,
    };
    const fixedCopy = getFixedExamQuestionCopy(level, slot.section, slot.position);
    if (!fixedCopy) return normalized;
    return {
      ...normalized,
      instruction: normalized.instruction.trim() ? normalized.instruction : fixedCopy.instruction ?? normalized.instruction,
      prompt: normalized.prompt.trim() ? normalized.prompt : fixedCopy.prompt ?? normalized.prompt,
    };
  });
}
