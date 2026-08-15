import { z } from "zod";

import type { VocabularyItem } from "@/content/schema";
import { normalizeAnswer } from "@/lib/learning-core/answers";
import { adaptivePriorityScore, type SpeedTestWordProgress } from "@/lib/speed-test/domain";

export const cardReactionLevels = ["easy", "medium", "hard"] as const;
export const cardReactionDirections = ["ko_vi", "vi_ko", "mixed"] as const;
export const cardReactionModes = ["choose", "type"] as const;
export type CardReactionLevel = (typeof cardReactionLevels)[number];
export type CardReactionDirection = (typeof cardReactionDirections)[number];
export type CardReactionMode = (typeof cardReactionModes)[number];
export type CardReactionGrade = "perfect" | "great" | "good" | "miss";

export const cardReactionRules = {
  version: 1,
  lives: 5,
  levels: {
    easy: { size: 3, cards: 9, seconds: 45, choices: 3, multiplier: 1 },
    medium: { size: 4, cards: 16, seconds: 75, choices: 4, multiplier: 1.25 },
    hard: { size: 5, cards: 25, seconds: 120, choices: 5, multiplier: 1.6 },
  },
  thresholdsMs: {
    choose: { perfect: 700, great: 1_300, good: 2_500 },
    type: { perfect: 1_000, great: 2_000, good: 3_500 },
  },
  gradePoints: { perfect: 180, great: 140, good: 100, miss: 0 },
  revengeBonus: 100,
} as const;

export type CardReactionCard = {
  id: string;
  vocabularyId: string;
  type: "word" | "image";
  content: string;
  imageUrl?: string;
  korean: string;
  vietnamese: string;
  audioUrl?: string;
  direction: "ko_vi" | "vi_ko";
  correctAnswer: string;
  acceptedAnswers: string[];
  options: string[];
};

function shuffle<T>(items: readonly T[], random: () => number) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

export function createCardReactionBoard({
  vocabulary,
  level,
  direction,
  progressById = {},
  random = Math.random,
}: {
  vocabulary: readonly VocabularyItem[];
  level: CardReactionLevel;
  direction: CardReactionDirection;
  progressById?: Readonly<Record<string, SpeedTestWordProgress>>;
  random?: () => number;
}) {
  const rule = cardReactionRules.levels[level];
  const ranked = [...vocabulary].sort((left, right) =>
    adaptivePriorityScore(progressById[right.id]) - adaptivePriorityScore(progressById[left.id])
  );
  const priorityCount = Math.min(ranked.length, Math.ceil(rule.cards * 0.3));
  const picked = shuffle([...shuffle(ranked.slice(0, priorityCount), random), ...shuffle(ranked.slice(priorityCount), random)].slice(0, rule.cards), random);
  return picked.map<CardReactionCard>((item, index) => {
    const cardDirection = direction === "mixed" ? (index % 2 === 0 ? "ko_vi" : "vi_ko") : direction;
    const correctAnswer = cardDirection === "ko_vi" ? item.vietnamese : item.korean;
    const candidates = vocabulary.filter((candidate) => candidate.id !== item.id).map((candidate) =>
      cardDirection === "ko_vi" ? candidate.vietnamese : candidate.korean
    );
    const distractors = shuffle([...new Set(candidates.filter((candidate) => normalizeAnswer(candidate) !== normalizeAnswer(correctAnswer)))], random)
      .slice(0, rule.choices - 1);
    return {
      id: `card:${cardDirection}:${item.id}`,
      vocabularyId: item.id,
      type: "word",
      content: cardDirection === "ko_vi" ? item.korean : item.vietnamese,
      korean: item.korean,
      vietnamese: item.vietnamese,
      audioUrl: item.audioUrl,
      direction: cardDirection,
      correctAnswer,
      acceptedAnswers: cardDirection === "ko_vi"
        ? [item.vietnamese, ...(item.acceptedVietnameseAnswers ?? [])]
        : [item.korean, ...(item.acceptedKoreanAnswers ?? [])],
      options: shuffle([correctAnswer, ...distractors], random),
    };
  });
}

export function isCorrectCardAnswer(answer: string, card: CardReactionCard) {
  const normalized = normalizeAnswer(answer);
  return card.acceptedAnswers.some((candidate) => normalizeAnswer(candidate) === normalized);
}

export function gradeCardAnswer(mode: CardReactionMode, correct: boolean, reactionTimeMs: number): CardReactionGrade {
  if (!correct) return "miss";
  const threshold = cardReactionRules.thresholdsMs[mode];
  if (reactionTimeMs <= threshold.perfect) return "perfect";
  if (reactionTimeMs <= threshold.great) return "great";
  return "good";
}

export function cardComboMultiplier(combo: number) {
  if (combo >= 12) return 2;
  if (combo >= 8) return 1.6;
  if (combo >= 5) return 1.35;
  if (combo >= 3) return 1.15;
  return 1;
}

export function scoreCardAnswer(level: CardReactionLevel, grade: CardReactionGrade, combo: number, revenge: boolean) {
  return Math.round(cardReactionRules.gradePoints[grade] * cardReactionRules.levels[level].multiplier * cardComboMultiplier(combo) + (revenge ? cardReactionRules.revengeBonus : 0));
}

export const cardReactionFinishSchema = z.object({
  attemptId: z.string().uuid(),
  courseSlug: z.string().min(1).max(120),
  lessonSlug: z.string().min(1).max(120),
  level: z.enum(cardReactionLevels),
  direction: z.enum(cardReactionDirections),
  mode: z.enum(cardReactionModes),
  boardCardIds: z.array(z.string().min(1).max(250)).min(1).max(25),
  answers: z.array(z.object({
    cardId: z.string().min(1).max(250),
    userAnswer: z.string().max(500),
    reactionTimeMs: z.number().int().min(0).max(60_000),
    position: z.number().int().min(1).max(200),
  })).max(200),
  remainingMs: z.number().int().min(0).max(120_000),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime(),
}).superRefine((input, context) => {
  const expected = cardReactionRules.levels[input.level].cards;
  if (input.boardCardIds.length !== expected || new Set(input.boardCardIds).size !== expected) {
    context.addIssue({ code: "custom", path: ["boardCardIds"], message: "Board không hợp lệ." });
  }
  if (input.answers.some((answer, index) => answer.position !== index + 1 || !input.boardCardIds.includes(answer.cardId))) {
    context.addIssue({ code: "custom", path: ["answers"], message: "Câu trả lời không thuộc board." });
  }
});
