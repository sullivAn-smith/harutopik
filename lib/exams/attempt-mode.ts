import { z } from "zod";
import type { ExamSection } from "./types";

export const examAttemptModeSchema = z.enum(["listening", "reading", "full"]);

export type ExamAttemptMode = z.infer<typeof examAttemptModeSchema>;

export function buildExamAttemptPlan<T extends { section: ExamSection }>(input: {
  mode: ExamAttemptMode;
  listeningDurationMinutes: number;
  readingDurationMinutes: number;
  questions: readonly T[];
}) {
  const questions = input.mode === "full"
    ? [...input.questions]
    : input.questions.filter((question) => question.section === input.mode);
  const durationMinutes = input.mode === "listening"
    ? input.listeningDurationMinutes
    : input.mode === "reading"
      ? input.readingDurationMinutes
      : input.listeningDurationMinutes + input.readingDurationMinutes;

  return {
    questions,
    durationMinutes,
    initialSection: (input.mode === "reading" ? "reading" : "listening") as ExamSection,
    maximumScore: input.mode === "full" ? 200 : 100,
  };
}

export function examAttemptModeLabel(mode: ExamAttemptMode) {
  if (mode === "listening") return "Chỉ Nghe";
  if (mode === "reading") return "Chỉ Đọc";
  return "Mô phỏng đầy đủ";
}
