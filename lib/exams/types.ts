import { z } from "zod";

export const examOptionSchema = z.string().trim().min(1).max(500);

export const examQuestionSchema = z.object({
  id: z.string().uuid().optional(),
  position: z.number().int().positive(),
  section: z.literal("listening").default("listening"),
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
  durationMinutes: z.number().int().min(1).max(180),
  instructions: z.string().trim().max(4000).default(""),
  questions: z.array(examQuestionSchema).max(100),
});

export type ExamQuestionInput = z.infer<typeof examQuestionSchema>;
export type ExamDraftInput = z.infer<typeof examDraftSchema>;

export type ExamSummary = {
  id: string;
  code: string;
  title: string;
  description: string;
  durationMinutes: number;
  status: string;
  questionCount: number;
  updatedAt: string;
};

export type PublicExamQuestion = Omit<ExamQuestionInput, "correctOption" | "explanation"> & {
  id: string;
};
