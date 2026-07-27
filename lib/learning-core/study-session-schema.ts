import { z } from "zod";

const indexListSchema = z.array(z.number().int().nonnegative()).max(500);

export const studySessionStateSchema = z.object({
  schemaVersion: z.literal(1),
  mode: z.enum([
    "flashcard",
    "quiz",
    "typing",
    "matching",
    "dictation",
    "translation",
  ]),
  current: z.number().int().nonnegative(),
  flipped: z.boolean(),
  learnedIndices: indexListSchema,
  shuffleSeed: z.number().int().nonnegative(),
  quizAnswer: z.string().nullable(),
  quizCorrectCount: z.number().int().nonnegative(),
  quizWrongIndices: indexListSchema,
  typedWord: z.string().max(500),
  typingChecked: z.boolean(),
  typingWrongIndices: indexListSchema,
  selectedKorean: z.number().int().nonnegative().nullable(),
  matchedIndices: indexListSchema,
  matchingWrongIndices: indexListSchema,
  matchingReviewMode: z.boolean().default(false),
  matchingReviewIndices: indexListSchema.default([]),
  dictationIndex: z.number().int().nonnegative(),
  dictationInput: z.string().max(2_000),
  dictationChecked: z.boolean(),
  dictationHint: z.number().int().nonnegative(),
  dictationWrongIndices: indexListSchema,
  translationIndex: z.number().int().nonnegative(),
  translationDirection: z.enum(["vi-ko", "ko-vi"]),
  translationInput: z.string().max(2_000),
  translationChecked: z.boolean(),
  translationViKoCompletedIndices: indexListSchema.default([]),
  translationWrongIndices: indexListSchema,
  updatedAt: z.iso.datetime(),
});

export const studySessionUpsertSchema = z.object({
  lessonId: z.string().min(1).max(200),
  lessonVersion: z.number().int().positive(),
  state: studySessionStateSchema,
});

export type StudySessionState = z.infer<typeof studySessionStateSchema>;
