export const lessonSpeedTestUnlockPercent = 100;
/** Kept for backwards-compatible progress payloads; accuracy no longer gates lesson progress. */
export const lessonPracticeAccuracyRequirement = 70;

export const lessonProgressModes = [
  "flashcard",
  "quiz",
  "typing",
  "matching",
  "dictation",
  "translation",
  "grammar",
] as const;

export type LessonProgressMode = (typeof lessonProgressModes)[number];
export type ActiveLessonPracticeMode = Exclude<
  LessonProgressMode,
  "flashcard" | "grammar"
>;

export type LessonPracticeEvidence = {
  mode: LessonProgressMode;
  score: number | null;
  total: number | null;
};

export type LessonProgressComponents = {
  vocabulary: number;
  grammar: number;
  practice: number;
  accuracy: number;
};

export type LessonProgressSnapshot = {
  completionPercent: number;
  unlockThreshold: number;
  speedTestUnlocked: boolean;
  unlockedAt: string | null;
  bestPracticeAccuracy: number;
  completedModes: LessonProgressMode[];
  components: LessonProgressComponents;
  recommendation: string;
  recommendedMode: LessonProgressMode | null;
};

export type LessonProgressCalculation = Omit<
  LessonProgressSnapshot,
  "speedTestUnlocked" | "unlockedAt"
> & {
  eligibleForSpeedTest: boolean;
};

type CalculateLessonProgressInput = {
  vocabularyIds: readonly string[];
  learnedVocabularyIds: readonly string[];
  hasGrammar: boolean;
  availablePracticeModes: readonly ActiveLessonPracticeMode[];
  practices: readonly LessonPracticeEvidence[];
};

export function calculateLessonProgress({
  vocabularyIds,
  learnedVocabularyIds,
  hasGrammar,
  availablePracticeModes,
  practices,
}: CalculateLessonProgressInput): LessonProgressCalculation {
  const vocabularyIdSet = new Set(vocabularyIds);
  const learnedCount = new Set(
    learnedVocabularyIds.filter((id) => vocabularyIdSet.has(id)),
  ).size;
  const vocabulary = vocabularyIds.length
    ? percentage(learnedCount, vocabularyIds.length)
    : 100;

  const trackedPracticeModes = availablePracticeModes.filter(
    (mode) => mode === "quiz",
  );
  const availableModeSet = new Set(trackedPracticeModes);
  const completedModes = new Set<LessonProgressMode>();
  const bestAccuracyByMode = new Map<ActiveLessonPracticeMode, number>();

  for (const practice of practices) {
    if (practice.mode === "grammar") {
      completedModes.add(practice.mode);
      continue;
    }
    if (practice.mode !== "quiz") continue;
    completedModes.add(practice.mode);
    if (
      !availableModeSet.has(practice.mode) ||
      practice.score === null ||
      practice.total === null ||
      practice.total <= 0
    ) {
      continue;
    }
    const accuracy = percentage(practice.score, practice.total);
    bestAccuracyByMode.set(
      practice.mode,
      Math.max(accuracy, bestAccuracyByMode.get(practice.mode) ?? 0),
    );
  }

  const grammar = hasGrammar
    ? completedModes.has("grammar")
      ? 100
      : 0
    : 100;
  const completedActiveModes = trackedPracticeModes.filter((mode) =>
    completedModes.has(mode),
  );
  const practice = trackedPracticeModes.length
    ? percentage(completedActiveModes.length, trackedPracticeModes.length)
    : 100;
  const bestPracticeAccuracy = Math.max(0, ...bestAccuracyByMode.values());
  const accuracy = trackedPracticeModes.length ? bestPracticeAccuracy : 100;

  const completionPercent = vocabulary;
  const eligibleForSpeedTest =
    completionPercent >= lessonSpeedTestUnlockPercent;
  const recommendation = getLessonProgressRecommendation({
    vocabulary,
    learnedCount,
    vocabularyTotal: vocabularyIds.length,
    eligibleForSpeedTest,
  });

  return {
    completionPercent,
    unlockThreshold: lessonSpeedTestUnlockPercent,
    eligibleForSpeedTest,
    bestPracticeAccuracy,
    completedModes: [...completedModes],
    components: { vocabulary, grammar, practice, accuracy },
    recommendation: recommendation.label,
    recommendedMode: recommendation.mode,
  };
}

function getLessonProgressRecommendation({
  vocabulary,
  learnedCount,
  vocabularyTotal,
  eligibleForSpeedTest,
}: {
  vocabulary: number;
  learnedCount: number;
  vocabularyTotal: number;
  eligibleForSpeedTest: boolean;
}) {
  if (eligibleForSpeedTest) {
    return {
      label: "Speed Test đã sẵn sàng. Hãy bắt đầu thử thách phản xạ.",
      mode: null,
    };
  }
  if (vocabulary < 100) {
    const remaining = Math.max(
      1,
      vocabularyTotal - learnedCount,
    );
    return {
      label: `Đánh dấu đã thuộc thêm ${remaining} từ để hoàn thành bài học.`,
      mode: "flashcard" as const,
    };
  }
  return {
    label: "Tiếp tục ôn lại từ vựng để duy trì ghi nhớ.",
    mode: "flashcard" as const,
  };
}

function percentage(value: number, total: number) {
  return clamp(Math.round((value / total) * 100), 0, 100);
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}
