import { z } from "zod";

export const learningEventSchema = z.object({
  eventId: z.uuid(),
  eventType: z.enum(["practice_completed", "review_rated"]),
  lessonId: z.string().min(1),
  lessonVersion: z.number().int().positive(),
  mode: z.enum([
    "flashcard",
    "quiz",
    "typing",
    "matching",
    "dictation",
    "translation",
    "grammar",
  ]),
  score: z.number().int().min(0).optional(),
  total: z.number().int().positive().optional(),
  durationSeconds: z.number().int().min(0).max(86400),
  completedAt: z.iso.datetime(),
  reviews: z
    .array(
      z.object({
        contentId: z.string().min(1),
        rating: z.enum(["again", "hard", "good", "easy"]),
      }),
    )
    .max(200)
    .default([]),
});

export type LearningEventInput = z.infer<typeof learningEventSchema>;
