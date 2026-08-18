import { z } from "zod";
import { vocabularyItemSchema } from "@/content/schema";

export const customVocabularyLimit = 50;
export const customVocabularyLessonId = "custom";
export const customVocabularyIdPrefix = "custom-";

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

export const createCustomVocabularyItemSchema = z.object({
  korean: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập từ tiếng Hàn.")
    .max(120, "Từ tiếng Hàn không được vượt quá 120 ký tự."),
  vietnamese: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập nghĩa tiếng Việt.")
    .max(240, "Nghĩa tiếng Việt không được vượt quá 240 ký tự."),
  romanization: z.string().trim().max(160).optional().default(""),
  partOfSpeech: z.string().trim().max(80).optional().default(""),
  example: z.string().trim().max(500).optional().default(""),
  category: z.string().trim().max(100).optional().default(""),
});

export type CustomVocabularyItemInput = z.infer<
  typeof createCustomVocabularyItemSchema
>;

export function isCustomVocabularyItem(
  item: { vocabularyId: string; lessonId: string },
) {
  return (
    item.vocabularyId.startsWith(customVocabularyIdPrefix) &&
    item.lessonId === customVocabularyLessonId
  );
}

export function buildCustomVocabularySnapshot(
  id: string,
  input: CustomVocabularyItemInput,
) {
  const example = input.example.trim();
  return vocabularyItemSchema.parse({
    id,
    korean: input.korean.trim(),
    vietnamese: input.vietnamese.trim(),
    romanization: input.romanization.trim() || "—",
    category: input.category.trim() || "Từ cá nhân",
    partOfSpeech: input.partOfSpeech.trim() || undefined,
    examples: example
      ? [
          {
            id: `${id}-example-1`,
            korean: example,
            vietnamese: input.vietnamese.trim(),
          },
        ]
      : [],
  });
}

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
