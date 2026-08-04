import { z } from "zod";
import { vocabularyItemSchema } from "@/content/schema";

export const createVocabularyListSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Tên danh sách cần ít nhất 2 ký tự.")
    .max(60, "Tên danh sách không được vượt quá 60 ký tự."),
});

export const updateVocabularyListSchema = createVocabularyListSchema;

export const saveVocabularyItemSchema = z.object({
  vocabularyId: z.string().min(1).max(200),
  lessonId: z.string().min(1).max(200),
  item: vocabularyItemSchema,
});

export const updatePersonalVocabularyItemSchema = z.object({
  item: vocabularyItemSchema,
});

export type VocabularyListSummary = {
  id: string;
  name: string;
  kind: "favorites" | "custom";
  itemCount: number;
  items?: Array<{
    vocabularyId: string;
    lessonId: string;
    item: z.infer<typeof vocabularyItemSchema>;
    createdAt: string;
  }>;
};
