import { z } from "zod";
import { vocabularyItemSchema, type VocabularyItem } from "@/content/schema";

export const vocabularyStatusSchema = z.enum([
  "draft",
  "changes_requested",
  "in_review",
  "approved",
  "published",
  "unpublished",
  "archived",
]);

export const vocabularyMasterSchema = z.object({
  id: z.string().min(1).max(200),
  hangul: z.string().min(1).max(200),
  normalizedHangul: z.string().min(1).max(200),
  romanization: z.string().max(300),
  primaryMeaningVi: z.string().min(1).max(500),
  partOfSpeech: z.string().nullable(),
  level: z.string().min(1).max(100),
  category: z.string().min(1).max(120),
  audioUrl: z.string().nullable(),
  imageUrl: z.string().nullable(),
  status: vocabularyStatusSchema,
});

export const vocabularyMeaningSchema = z.object({
  id: z.string().uuid(),
  vocabularyId: z.string().min(1),
  meaningVi: z.string().min(1),
  isPrimary: z.boolean(),
  context: z.string(),
  position: z.number().int().positive(),
});

export const acceptedAnswerSchema = z.object({
  id: z.string().uuid(),
  vocabularyId: z.string().min(1),
  direction: z.enum(["ko_vi", "vi_ko"]),
  answer: z.string().min(1),
  normalizedAnswer: z.string().min(1),
});

export type VocabularyMaster = z.infer<typeof vocabularyMasterSchema>;
export type VocabularyMeaning = z.infer<typeof vocabularyMeaningSchema>;
export type AcceptedAnswer = z.infer<typeof acceptedAnswerSchema>;

export function normalizeKorean(input: string) {
  return input.normalize("NFC").trim().replace(/\s+/g, " ");
}

export function normalizeAnswer(input: string) {
  return input
    .normalize("NFC")
    .trim()
    .toLocaleLowerCase("vi")
    .replace(/[.,!?;:()[\]{}"'’“”]/g, "")
    .replace(/\s+/g, " ");
}

export function toRuntimeVocabulary(input: {
  master: VocabularyMaster;
  examples: VocabularyItem["examples"];
  acceptedVietnameseAnswers?: string[];
  acceptedKoreanAnswers?: string[];
}): VocabularyItem {
  return vocabularyItemSchema.parse({
    id: input.master.id,
    korean: input.master.hangul,
    vietnamese: input.master.primaryMeaningVi,
    romanization: input.master.romanization,
    category: input.master.category,
    ...(input.master.partOfSpeech
      ? { partOfSpeech: input.master.partOfSpeech }
      : {}),
    ...(input.master.audioUrl ? { audioUrl: input.master.audioUrl } : {}),
    ...(input.master.imageUrl ? { imageUrl: input.master.imageUrl } : {}),
    acceptedVietnameseAnswers: input.acceptedVietnameseAnswers ?? [],
    acceptedKoreanAnswers: input.acceptedKoreanAnswers ?? [],
    examples: input.examples,
  });
}
