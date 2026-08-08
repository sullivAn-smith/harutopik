import type { ExamAnswerType, ExamQuestionInput, ExamReadingType, ExamSection } from "@/lib/exams/types";

export type StoredExamQuestion = {
  id: string;
  position: number;
  section: ExamSection;
  audio_block_key?: string | null;
  reading_type?: ExamReadingType | null;
  passage_block_key?: string | null;
  passage?: string | null;
  answer_type?: ExamAnswerType | null;
  instruction: string;
  prompt: string;
  audio_url: string | null;
  audio_text: string | null;
  image_url: string | null;
  play_limit: number;
  options: unknown;
  option_images?: unknown;
  correct_option: number;
  explanation: string;
};

export function normalizeExamQuestion(item: StoredExamQuestion): ExamQuestionInput {
  const options = Array.isArray(item.options) ? item.options.map(String).slice(0, 4) : [];
  while (options.length < 4) options.push("");
  const optionImages = Array.isArray(item.option_images) ? item.option_images.map(String).slice(0, 4) : [];
  while (optionImages.length < 4) optionImages.push("");

  return {
    id: item.id,
    position: item.position,
    section: item.section,
    audioBlockKey: item.audio_block_key ?? "",
    readingType: item.reading_type ?? "standard",
    passageBlockKey: item.passage_block_key ?? "",
    passage: item.passage ?? "",
    answerType: item.answer_type === "image" ? "image" : "text",
    instruction: item.instruction,
    prompt: item.prompt,
    audioUrl: item.audio_url ?? "",
    audioText: item.audio_text ?? "",
    imageUrl: item.image_url ?? "",
    playLimit: item.play_limit,
    options,
    optionImages,
    correctOption: item.correct_option,
    explanation: item.explanation,
  };
}
