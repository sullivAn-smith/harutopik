import { z } from "zod";

const optionalUrl = z.union([
  z.literal(""),
  z.string().url("URL chưa đúng định dạng."),
]);

export const vocabularyFormSchema = z.object({
  vocabularyId: z.string().optional(),
  hangul: z.string().trim().min(1, "Hãy nhập từ tiếng Hàn.").max(200),
  romanization: z.string().trim().max(300),
  primaryMeaningVi: z
    .string()
    .trim()
    .min(1, "Hãy nhập nghĩa tiếng Việt.")
    .max(500),
  partOfSpeech: z.string().trim().max(100),
  level: z.string().trim().min(1).max(100),
  category: z.string().trim().min(1).max(120),
  audioUrl: optionalUrl,
  imageUrl: optionalUrl,
  acceptedVi: z.string(),
  acceptedKo: z.string(),
  examplesJson: z.string(),
});

export type VocabularyFormState = {
  status: "idle" | "error";
  message?: string;
  fields?: Record<string, string[]>;
};

export const initialVocabularyFormState: VocabularyFormState = {
  status: "idle",
};

export function parseAnswerLines(value: string) {
  return [...new Set(value.split("\n").map((item) => item.trim()).filter(Boolean))];
}

export function parseExamplesJson(value: string) {
  const parsed = JSON.parse(value || "[]") as unknown;
  return z
    .array(
      z.object({
        korean: z.string().trim().min(1),
        vietnamese: z.string().trim().min(1),
      }),
    )
    .parse(parsed);
}
