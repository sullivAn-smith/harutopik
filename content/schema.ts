import { z } from "zod";

const localizedTextSchema = z.object({
  ko: z.string().min(1),
  vi: z.string().min(1),
});

const exampleSchema = z.object({
  id: z.string().min(1),
  korean: z.string().min(1),
  vietnamese: z.string().min(1),
});

export const vocabularyItemSchema = z.object({
  id: z.string().min(1),
  korean: z.string().min(1),
  vietnamese: z.string().min(1),
  romanization: z.string().min(1),
  category: z.string().min(1),
  partOfSpeech: z.string().optional(),
  imageUrl: z.string().min(1).optional(),
  audioUrl: z.string().min(1).optional(),
  acceptedVietnameseAnswers: z.array(z.string().min(1)).optional(),
  acceptedKoreanAnswers: z.array(z.string().min(1)).optional(),
  examples: z.array(exampleSchema).default([]),
});

export const grammarPointSchema = z.object({
  id: z.string().min(1),
  form: z.string().min(1),
  title: z.string().min(1),
  explanation: z.string().min(1),
  formula: z.string().min(1),
  examples: z.array(exampleSchema).min(1),
});

const baseExerciseSchema = z.object({
  id: z.string().min(1),
  explanation: z.string().optional(),
  points: z.number().positive().default(1),
});

const fillBlankExerciseSchema = baseExerciseSchema.extend({
  type: z.literal("fill-blank"),
  prompt: z.string().min(1),
  translation: z.string().min(1),
  acceptedAnswers: z.array(z.string().min(1)).min(1),
});

const dictationExerciseSchema = baseExerciseSchema.extend({
  type: z.literal("dictation"),
  sentence: z.string().min(1),
});

const translationExerciseSchema = baseExerciseSchema.extend({
  type: z.literal("translation"),
  vietnamese: z.string().min(1),
  korean: z.string().min(1),
  acceptedVietnameseAnswers: z.array(z.string().min(1)).default([]),
  acceptedKoreanAnswers: z.array(z.string().min(1)).default([]),
});

export const exerciseSchema = z.discriminatedUnion("type", [
  fillBlankExerciseSchema,
  dictationExerciseSchema,
  translationExerciseSchema,
]);

export const lessonSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  courseId: z.string().min(1),
  moduleId: z.string().min(1),
  order: z.number().int().positive(),
  version: z.number().int().positive(),
  status: z.enum(["draft", "in-review", "approved", "published", "archived"]),
  title: localizedTextSchema,
  summary: z.string().min(1),
  objectives: z.array(z.string().min(1)).min(1),
  vocabulary: z.array(vocabularyItemSchema),
  grammar: z.array(grammarPointSchema),
  exercises: z.array(exerciseSchema),
});

export type VocabularyItem = z.infer<typeof vocabularyItemSchema>;
export type GrammarPoint = z.infer<typeof grammarPointSchema>;
export type Exercise = z.infer<typeof exerciseSchema>;
export type Lesson = z.infer<typeof lessonSchema>;

export function defineLesson(input: Lesson): Lesson {
  const lesson = lessonSchema.parse(input);
  const ids = [
    ...lesson.vocabulary.map((item) => item.id),
    ...lesson.grammar.map((item) => item.id),
    ...lesson.exercises.map((item) => item.id),
  ];

  if (new Set(ids).size !== ids.length) {
    throw new Error(`Lesson ${lesson.id} contains duplicate content IDs.`);
  }

  return lesson;
}
