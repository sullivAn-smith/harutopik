import { z } from "zod";
import { normalizeAnswer } from "@/lib/learning-core/answers";

export const speedTestDirections = ["vi_ko", "ko_vi"] as const;
export type SpeedTestDirection = (typeof speedTestDirections)[number];

export const speedTestRules = {
  version: 1,
  startingSeconds: 60,
  maximumSeconds: 120,
  correctBonusSeconds: 2,
  wrongPenaltySeconds: 1,
  feedbackDelayMs: 320,
  comboBonuses: { 5: 1, 10: 2 } as Record<number, number>,
} as const;

export const speedTestQuestionCountSchema = z.union([
  z.literal(10),
  z.literal(20),
  z.literal(30),
  z.literal("all"),
]);

export const speedTestStartSchema = z.object({
  listId: z.string().uuid(),
  direction: z.enum(speedTestDirections),
  questionCount: speedTestQuestionCountSchema,
});

export const speedTestSubmittedAnswerSchema = z.object({
  vocabularyId: z.string().min(1).max(200),
  userAnswer: z.string().max(500),
  responseTimeMs: z.number().int().min(0).max(600_000),
  position: z.number().int().min(1).max(500),
  timeBefore: z.number().int().min(0).max(speedTestRules.maximumSeconds),
  timeAfter: z.number().int().min(0).max(speedTestRules.maximumSeconds),
});

export const speedTestFinishSchema = z.object({
  attemptId: z.string().uuid(),
  source: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("list"), listId: z.string().uuid() }),
    z.object({
      kind: z.literal("lesson"),
      courseSlug: z.string().min(1).max(120),
      lessonSlug: z.string().min(1).max(120),
    }),
  ]),
  direction: z.enum(speedTestDirections),
  requestedQuestionCount: speedTestQuestionCountSchema,
  questionIds: z.array(z.string().min(1).max(200)).min(1).max(500),
  answers: z.array(speedTestSubmittedAnswerSchema).max(500),
  startingSeconds: z.literal(speedTestRules.startingSeconds),
  remainingSeconds: z.number().int().min(0).max(speedTestRules.maximumSeconds),
  bestCombo: z.number().int().min(0).max(500),
  finishedReason: z.enum(["completed", "timed_out"]),
  dailyChallenge: z.boolean().default(false),
  challengeDate: z.string().date().optional(),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime(),
}).superRefine((input, context) => {
  if (input.dailyChallenge && !input.challengeDate) {
    context.addIssue({
      code: "custom",
      path: ["challengeDate"],
      message: "Daily Challenge cần ngày thử thách.",
    });
  }
  if (input.dailyChallenge && input.requestedQuestionCount !== 20) {
    context.addIssue({
      code: "custom",
      path: ["requestedQuestionCount"],
      message: "Daily Challenge luôn dùng tối đa 20 câu.",
    });
  }
});

export type SpeedTestVocabularySnapshot = {
  id: string;
  korean: string;
  vietnamese: string;
  acceptedKoreanAnswers?: string[];
  acceptedVietnameseAnswers?: string[];
};

export type SpeedTestAnswerResult = "correct" | "near_miss" | "wrong";

export type SpeedTestWordProgress = {
  masteryScore: number;
  wrongCount: number;
  nearMissCount: number;
  lastWrongAt?: string | null;
  averageResponseTimeMs?: number;
  lastSeenAt?: string | null;
  memoryStrength?: number;
};

export function adaptivePriorityScore(progress: SpeedTestWordProgress | undefined, now = Date.now()) {
  if (!progress) return 35;
  const weakness = Math.max(0, 100 - progress.masteryScore);
  const mistakes = Math.min(30, progress.wrongCount * 5 + progress.nearMissCount * 2);
  const slowness = Math.min(20, Math.max(0, (progress.averageResponseTimeMs ?? 0) - 1_200) / 140);
  const lastSeen = progress.lastSeenAt ? Date.parse(progress.lastSeenAt) : Number.NaN;
  const daysSinceSeen = Number.isFinite(lastSeen) ? Math.max(0, (now - lastSeen) / 86_400_000) : 30;
  const forgetting = Math.min(25, daysSinceSeen * 1.5);
  const recentWrong = progress.lastWrongAt && Number.isFinite(Date.parse(progress.lastWrongAt))
    ? Math.max(0, 15 - (now - Date.parse(progress.lastWrongAt)) / 86_400_000)
    : 0;
  return weakness * 0.45 + mistakes + slowness + forgetting + recentWrong;
}

export function acceptedAnswersForDirection(
  item: SpeedTestVocabularySnapshot,
  direction: SpeedTestDirection,
) {
  return direction === "vi_ko"
    ? [item.korean, ...(item.acceptedKoreanAnswers ?? [])]
    : [item.vietnamese, ...(item.acceptedVietnameseAnswers ?? [])];
}

export function isCorrectSpeedTestAnswer(
  answer: string,
  item: SpeedTestVocabularySnapshot,
  direction: SpeedTestDirection,
) {
  const normalized = normalizeAnswer(answer);
  return acceptedAnswersForDirection(item, direction).some(
    (candidate) => normalizeAnswer(candidate) === normalized,
  );
}

function editDistance(left: string, right: string) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = previous[0];
    previous[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const above = previous[rightIndex];
      previous[rightIndex] = Math.min(
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + 1,
        diagonal + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return previous[right.length];
}

export function classifySpeedTestAnswer(
  answer: string,
  item: SpeedTestVocabularySnapshot,
  direction: SpeedTestDirection,
): SpeedTestAnswerResult {
  const normalized = normalizeAnswer(answer);
  const candidates = acceptedAnswersForDirection(item, direction).map((candidate) =>
    normalizeAnswer(candidate)
  );
  if (candidates.includes(normalized)) return "correct";
  if (
    normalized.length >= 2 &&
    candidates.some((candidate) =>
      Math.abs(candidate.length - normalized.length) <= 1 &&
      editDistance(normalized, candidate) === 1
    )
  ) return "near_miss";
  return "wrong";
}

export function selectSpeedTestQuestions<T>(
  items: readonly T[],
  requested: z.infer<typeof speedTestQuestionCountSchema>,
  random: () => number = Math.random,
) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled.slice(
    0,
    requested === "all" ? shuffled.length : Math.min(requested, shuffled.length),
  );
}

function shuffledCopy<T>(items: readonly T[], random: () => number) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled;
}

export function selectAdaptiveSpeedTestQuestions<T extends { id: string }>(
  items: readonly T[],
  requested: z.infer<typeof speedTestQuestionCountSchema>,
  progressById: Readonly<Record<string, SpeedTestWordProgress>>,
  random: () => number = Math.random,
) {
  const targetCount = requested === "all"
    ? items.length
    : Math.min(requested, items.length);
  if (!targetCount) return [];
  const picked = new Set<string>();
  const take = (pool: readonly T[], count: number) =>
    shuffledCopy(pool.filter((item) => !picked.has(item.id)), random)
      .slice(0, count)
      .filter((item) => (picked.add(item.id), true));
  const previouslyWrong = items
    .filter((item) => {
      const progress = progressById[item.id];
      return progress && progress.wrongCount + progress.nearMissCount > 0;
    })
    .sort((left, right) => {
      const leftDate = progressById[left.id]?.lastWrongAt ?? "";
      const rightDate = progressById[right.id]?.lastWrongAt ?? "";
      return rightDate.localeCompare(leftDate);
    });
  const weak = items
    .filter((item) => (progressById[item.id]?.masteryScore ?? 100) < 65)
    .sort((left, right) =>
      (progressById[left.id]?.masteryScore ?? 100) -
      (progressById[right.id]?.masteryScore ?? 100)
    );
  const wrongTarget = requested === "all" ? previouslyWrong.length : Math.ceil(targetCount * 0.15);
  const weakTarget = requested === "all" ? weak.length : Math.ceil(targetCount * 0.2);
  const priority = [
    ...take(previouslyWrong, wrongTarget),
    ...take(weak, weakTarget),
  ];
  const randomItems = take(items, targetCount - priority.length);
  const orderedPriority = shuffledCopy(priority, random);
  const orderedRandom = shuffledCopy(randomItems, random);
  const result: T[] = [];
  while (result.length < targetCount) {
    if (orderedRandom.length) result.push(orderedRandom.shift()!);
    if (orderedPriority.length && result.length < targetCount) result.push(orderedPriority.shift()!);
    if (!orderedRandom.length && orderedPriority.length) result.push(...orderedPriority.splice(0));
  }
  return result.slice(0, targetCount);
}

export function nextTimeAfterAnswer({
  currentSeconds,
  correct,
  nextCombo,
}: {
  currentSeconds: number;
  correct: boolean;
  nextCombo: number;
}) {
  const delta = correct
    ? speedTestRules.correctBonusSeconds +
      (speedTestRules.comboBonuses[nextCombo] ?? 0)
    : -speedTestRules.wrongPenaltySeconds;
  return Math.max(
    0,
    Math.min(speedTestRules.maximumSeconds, currentSeconds + delta),
  );
}

export function calculateSpeedRating({
  accuracy,
  completed,
}: {
  accuracy: number;
  completed: boolean;
}) {
  if (completed && accuracy === 100) return "S+";
  if (completed && accuracy >= 95) return "A+";
  if (accuracy >= 90) return "A";
  if (accuracy >= 80) return "B";
  if (accuracy >= 65) return "C";
  return "D";
}

export type SpeedTestRecordAttempt = {
  accuracy: number;
  bestCombo: number;
  remainingSeconds: number;
  totalQuestions: number;
  completed: boolean;
};

export function deriveSpeedTestAchievements(attempts: readonly SpeedTestRecordAttempt[]) {
  const completed = attempts.filter((attempt) => attempt.completed);
  return {
    firstRun: attempts.length >= 1,
    perfect: completed.some((attempt) => attempt.accuracy === 100),
    comboMaster: attempts.some((attempt) => attempt.bestCombo >= 20),
    speedDemon: completed.some((attempt) =>
      attempt.totalQuestions >= 30 && attempt.remainingSeconds >= 60
    ),
    consistent: attempts.slice(0, 3).length === 3 &&
      attempts.slice(0, 3).every((attempt) => attempt.accuracy >= 90),
    veteran: attempts.length >= 10,
  };
}
