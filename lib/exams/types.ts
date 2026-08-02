import { z } from "zod";

export const examOptionSchema = z.string().trim().min(1).max(500);
export const examSectionSchema = z.enum(["listening", "reading"]);
export type ExamSection = z.infer<typeof examSectionSchema>;

export const examQuestionSchema = z.object({
  id: z.string().uuid().optional(),
  position: z.number().int().positive(),
  section: examSectionSchema.default("listening"),
  instruction: z.string().trim().max(500).default(""),
  prompt: z.string().trim().max(1000).default(""),
  audioUrl: z.union([z.literal(""), z.string().url("Audio phải là URL hợp lệ.")]),
  audioText: z.string().trim().max(500).default(""),
  imageUrl: z.union([z.literal(""), z.string().url()]).default(""),
  playLimit: z.number().int().min(1).max(10).default(1),
  options: z.array(examOptionSchema).length(4),
  correctOption: z.number().int().min(1).max(4),
  explanation: z.string().trim().max(2000).default(""),
});

export const examDraftSchema = z.object({
  code: z.string().trim().regex(/^[a-z0-9][a-z0-9-]{2,79}$/, "Mã đề chỉ gồm chữ thường, số và dấu gạch ngang."),
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(1000).default(""),
  listeningDurationMinutes: z.number().int().min(1).max(180),
  readingDurationMinutes: z.number().int().min(1).max(180),
  instructions: z.string().trim().max(4000).default(""),
  questions: z.array(examQuestionSchema).max(100),
});

export type ExamQuestionInput = z.infer<typeof examQuestionSchema>;
export type ExamDraftInput = z.infer<typeof examDraftSchema>;

export function getExamEligibility(questions: readonly ExamQuestionInput[]) {
  const listening = questions.filter((question) => question.section === "listening");
  const reading = questions.filter((question) => question.section === "reading");
  const issues: string[] = [];
  if (listening.length === 0) issues.push("Đề phải có ít nhất một câu nghe.");
  if (reading.length === 0) issues.push("Đề phải có ít nhất một câu đọc.");
  listening.forEach((question, index) => {
    if (!question.audioUrl) issues.push(`Câu nghe ${index + 1} đang thiếu audio.`);
  });
  return {
    eligible: issues.length === 0,
    listeningCount: listening.length,
    readingCount: reading.length,
    issues,
  };
}

export type ExamSummary = {
  id: string;
  code: string;
  title: string;
  description: string;
  durationMinutes: number;
  listeningDurationMinutes: number;
  readingDurationMinutes: number;
  status: string;
  questionCount: number;
  updatedAt: string;
};

export type PublicExamQuestion = Omit<ExamQuestionInput, "correctOption" | "explanation"> & {
  id: string;
};
