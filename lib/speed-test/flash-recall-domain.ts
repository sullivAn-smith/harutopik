import { z } from "zod";
import type { VocabularyItem } from "@/content/schema";
import { normalizeAnswer } from "@/lib/learning-core/answers";
import { adaptivePriorityScore, type SpeedTestWordProgress } from "@/lib/speed-test/domain";

export const flashRecallLevels = ["easy", "medium", "hard"] as const;
export const flashRecallDirections = ["ko_vi", "vi_ko", "mixed"] as const;
export type FlashRecallLevel = typeof flashRecallLevels[number];
export type FlashRecallDirection = typeof flashRecallDirections[number];
export type FlashRecallGrade = "perfect" | "great" | "good" | "miss";

export const flashRecallRules = {
  version: 1, lives: 5,
  levels: {
    easy: { questions: 10, showMs: 2_000, answerMs: 4_000, totalMs: 60_000, mode: "choose", multiplier: 1 },
    medium: { questions: 20, showMs: 1_200, answerMs: 3_000, totalMs: 120_000, mode: "type", multiplier: 1.35 },
    hard: { questions: 30, showMs: 600, answerMs: 2_000, totalMs: 180_000, mode: "type", multiplier: 1.7 },
  },
  thresholds: { easy: [900, 2_000], medium: [800, 1_500], hard: [550, 1_100] },
} as const;

export type FlashRecallQuestion = { id: string; vocabularyId: string; type: "word" | "image"; imageUrl?: string; prompt: string; expected: string; accepted: string[]; direction: "ko_vi" | "vi_ko"; options: string[] };

function shuffle<T>(items: readonly T[], random: () => number) { const out = [...items]; for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; } return out; }

export function buildFlashRecallQuestions({ vocabulary, level, direction, progressById = {}, random = Math.random }: { vocabulary: readonly VocabularyItem[]; level: FlashRecallLevel; direction: FlashRecallDirection; progressById?: Readonly<Record<string, SpeedTestWordProgress>>; random?: () => number }) {
  const count = flashRecallRules.levels[level].questions;
  const priorityScore = (progress: SpeedTestWordProgress | undefined) => adaptivePriorityScore(progress) + (progress?.memoryStrength === undefined ? 0 : (100 - progress.memoryStrength) * .35);
  const ranked = [...vocabulary].sort((a, b) => priorityScore(progressById[b.id]) - priorityScore(progressById[a.id]));
  const priority = Math.min(ranked.length, Math.ceil(count * .3));
  return shuffle([...shuffle(ranked.slice(0, priority), random), ...shuffle(ranked.slice(priority), random)].slice(0, count), random).map<FlashRecallQuestion>((item, index) => {
    const actual = direction === "mixed" ? (index % 2 ? "vi_ko" : "ko_vi") : direction;
    const expected = actual === "ko_vi" ? item.vietnamese : item.korean;
    const candidates = vocabulary.filter((v) => v.id !== item.id).map((v) => actual === "ko_vi" ? v.vietnamese : v.korean);
    return { id: `recall:${actual}:${item.id}`, vocabularyId: item.id, type: "word", imageUrl: item.imageUrl, prompt: actual === "ko_vi" ? item.korean : item.vietnamese, expected, direction: actual, accepted: actual === "ko_vi" ? [item.vietnamese, ...(item.acceptedVietnameseAnswers ?? [])] : [item.korean, ...(item.acceptedKoreanAnswers ?? [])], options: shuffle([expected, ...shuffle([...new Set(candidates)], random).slice(0, 3)], random) };
  });
}

export function checkFlashRecall(answer: string, question: FlashRecallQuestion) { const value = normalizeAnswer(answer); return question.accepted.some((item) => normalizeAnswer(item) === value); }
export function gradeFlashRecall(level: FlashRecallLevel, correct: boolean, ms: number): FlashRecallGrade { if (!correct) return "miss"; const [perfect, great] = flashRecallRules.thresholds[level]; return ms <= perfect ? "perfect" : ms <= great ? "great" : "good"; }
export function scoreFlashRecall(level: FlashRecallLevel, grade: FlashRecallGrade, combo: number) { const base = { perfect: 180, great: 140, good: 100, miss: 0 }[grade]; const streak = combo >= 10 ? 2 : combo >= 5 ? 1.5 : combo >= 3 ? 1.2 : 1; return Math.round(base * flashRecallRules.levels[level].multiplier * streak); }

export const flashRecallFinishSchema = z.object({ attemptId: z.string().uuid(), courseSlug: z.string(), lessonSlug: z.string(), level: z.enum(flashRecallLevels), direction: z.enum(flashRecallDirections), ranked: z.boolean().default(false), questionIds: z.array(z.string()).min(1).max(30), answers: z.array(z.object({ questionId: z.string(), userAnswer: z.string().max(500), recallTimeMs: z.number().int().min(0).max(10_000), position: z.number().int().positive() })).max(100), startedAt: z.string().datetime(), finishedAt: z.string().datetime(), remainingMs: z.number().int().min(0).max(180_000) }).superRefine((input, context) => {
  if (input.ranked && (input.level !== "medium" || input.direction !== "mixed")) {
    context.addIssue({ code: "custom", path: ["ranked"], message: "Cấu hình Flash Recall xếp hạng không hợp lệ." });
  }
});
