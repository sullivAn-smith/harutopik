import { z } from "zod";

const slugSchema = z
  .string()
  .trim()
  .min(2, "Slug cần ít nhất 2 ký tự.")
  .max(120)
  .regex(
    /^[a-z0-9][a-z0-9-]*$/,
    "Chỉ dùng chữ thường không dấu, số và dấu gạch ngang.",
  );

export const lessonDraftFormSchema = z.object({
  id: slugSchema.max(200),
  slug: slugSchema,
  courseId: slugSchema.max(200),
  moduleId: slugSchema.max(200),
  order: z.coerce.number().int().positive("Thứ tự phải lớn hơn 0."),
  titleVi: z.string().trim().min(2).max(160),
  titleKo: z.string().trim().min(1).max(160),
  summary: z.string().trim().min(10).max(1_000),
  objectives: z.string().trim().min(2),
  vocabulary: z.string().trim(),
  dictationsJson: z.string(),
  translationsJson: z.string(),
  grammarJson: z.string(),
  exercisesJson: z.string(),
  changeSummary: z.string().trim().max(500),
});

export type ContentFormState = {
  status: "idle" | "error";
  message?: string;
  fields?: Record<string, string[]>;
};

export const initialContentFormState: ContentFormState = { status: "idle" };

export function parseVocabularyLines(input: string, lessonId: string) {
  if (!input) return [];

  return input
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [korean, vietnamese, romanization, category, partOfSpeech] =
        line.split("|").map((part) => part.trim());
      if (!korean || !vietnamese || !romanization || !category) {
        throw new Error(
          `Dòng từ vựng ${index + 1} cần đủ: Hàn | Việt | Phiên âm | Chủ đề.`,
        );
      }
      return {
        id: `${lessonId}-vocabulary-${String(index + 1).padStart(3, "0")}`,
        korean,
        vietnamese,
        romanization,
        category,
        ...(partOfSpeech ? { partOfSpeech } : {}),
        examples: [],
      };
    });
}

const grammarDraftSchema = z.array(
  z.object({
    title: z.string().trim().min(1),
    form: z.string().trim().min(1),
    explanation: z.string().trim().min(1),
    formula: z.string().trim().min(1),
    examples: z
      .array(
        z.object({
          korean: z.string().trim().min(1),
          vietnamese: z.string().trim().min(1),
        }),
      )
      .min(1),
  }),
);

export function parseGrammarJson(input: string, lessonId: string) {
  const points = grammarDraftSchema.parse(JSON.parse(input || "[]"));
  return points.map((point, pointIndex) => ({
    id: `${lessonId}-grammar-${String(pointIndex + 1).padStart(3, "0")}`,
    form: point.form,
    title: point.title,
    explanation: point.explanation,
    formula: point.formula,
    examples: point.examples.map((example, exampleIndex) => ({
      id: `${lessonId}-grammar-${String(pointIndex + 1).padStart(3, "0")}-example-${String(exampleIndex + 1).padStart(3, "0")}`,
      ...example,
    })),
  }));
}

const grammarExerciseDraftSchema = z.array(
  z.object({
    prompt: z.string().trim().min(1),
    translation: z.string().trim().min(1),
    acceptedAnswers: z.array(z.string().trim().min(1)).min(1),
  }),
);

export function parseGrammarExercisesJson(input: string, lessonId: string) {
  const exercises = grammarExerciseDraftSchema.parse(JSON.parse(input || "[]"));
  return exercises.map((exercise, index) => ({
    id: `${lessonId}-grammar-exercise-${String(index + 1).padStart(3, "0")}`,
    type: "fill-blank" as const,
    prompt: exercise.prompt,
    translation: exercise.translation,
    acceptedAnswers: exercise.acceptedAnswers,
    points: 1,
  }));
}

const dictationExerciseDraftSchema = z
  .array(
    z.object({
      sentence: z.string().trim().min(1).max(500),
      audioUrl: z.string().url().optional(),
      acceptedAnswers: z.array(z.string().trim().min(1).max(500)).default([]),
    }),
  )
  .max(15, "Mỗi bài chỉ được có tối đa 15 câu chính tả.");

export function parseDictationExercisesJson(input: string, lessonId: string) {
  const exercises = dictationExerciseDraftSchema.parse(
    JSON.parse(input || "[]"),
  );
  return exercises.map((exercise, index) => ({
    id: `${lessonId}-dictation-${String(index + 1).padStart(3, "0")}`,
    type: "dictation" as const,
    sentence: exercise.sentence,
    ...(exercise.audioUrl ? { audioUrl: exercise.audioUrl } : {}),
    acceptedAnswers: exercise.acceptedAnswers,
    points: 1,
  }));
}

const translationExerciseDraftSchema = z
  .array(
    z.object({
      vietnamese: z.string().trim().min(1).max(500),
      korean: z.string().trim().min(1).max(500),
      acceptedVietnameseAnswers: z
        .array(z.string().trim().min(1).max(500))
        .default([]),
      acceptedKoreanAnswers: z
        .array(z.string().trim().min(1).max(500))
        .default([]),
    }),
  )
  .max(15, "Mỗi bài chỉ được có tối đa 15 câu dịch.");

export function parseTranslationExercisesJson(
  input: string,
  lessonId: string,
) {
  const exercises = translationExerciseDraftSchema.parse(
    JSON.parse(input || "[]"),
  );
  return exercises.map((exercise, index) => ({
    id: `${lessonId}-translation-${String(index + 1).padStart(3, "0")}`,
    type: "translation" as const,
    vietnamese: exercise.vietnamese,
    korean: exercise.korean,
    acceptedVietnameseAnswers: exercise.acceptedVietnameseAnswers,
    acceptedKoreanAnswers: exercise.acceptedKoreanAnswers,
    points: 1,
  }));
}
