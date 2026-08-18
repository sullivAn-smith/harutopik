export const lessonSpeedTestUnlockPercent = 100;
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

const weights = {
  vocabulary: 30,
  grammar: 20,
  practice: 35,
  accuracy: 15,
} as const;

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

  const availableModeSet = new Set(availablePracticeModes);
  const completedModes = new Set<LessonProgressMode>();
  const bestAccuracyByMode = new Map<ActiveLessonPracticeMode, number>();

  for (const practice of practices) {
    completedModes.add(practice.mode);
    if (
      practice.mode === "flashcard" ||
      practice.mode === "grammar" ||
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
  const completedActiveModes = availablePracticeModes.filter((mode) =>
    completedModes.has(mode),
  );
  const practice = availablePracticeModes.length
    ? percentage(completedActiveModes.length, availablePracticeModes.length)
    : 100;
  const bestPracticeAccuracy = Math.max(0, ...bestAccuracyByMode.values());
  const accuracy = availablePracticeModes.length ? bestPracticeAccuracy : 100;
  const accuracyProgress = availablePracticeModes.length
    ? percentage(
        Math.min(bestPracticeAccuracy, lessonPracticeAccuracyRequirement),
        lessonPracticeAccuracyRequirement,
      )
    : 100;

  const availableWeights = [
    vocabularyIds.length ? weights.vocabulary : 0,
    hasGrammar ? weights.grammar : 0,
    availablePracticeModes.length ? weights.practice : 0,
    availablePracticeModes.length ? weights.accuracy : 0,
  ];
  const availableWeight = availableWeights.reduce(
    (total, weight) => total + weight,
    0,
  );
  const weightedProgress =
    vocabulary * availableWeights[0] +
    grammar * availableWeights[1] +
    practice * availableWeights[2] +
    accuracyProgress * availableWeights[3];
  const completionPercent = availableWeight
    ? clamp(Math.round(weightedProgress / availableWeight), 0, 100)
    : 0;
  const eligibleForSpeedTest =
    completionPercent >= lessonSpeedTestUnlockPercent &&
    bestPracticeAccuracy >= lessonPracticeAccuracyRequirement &&
    completedActiveModes.length > 0;
  const recommendation = getLessonProgressRecommendation({
    vocabulary,
    learnedCount,
    vocabularyTotal: vocabularyIds.length,
    hasGrammar,
    grammar,
    availablePracticeModes,
    completedModes,
    bestPracticeAccuracy,
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
  hasGrammar,
  grammar,
  availablePracticeModes,
  completedModes,
  bestPracticeAccuracy,
  eligibleForSpeedTest,
}: {
  vocabulary: number;
  learnedCount: number;
  vocabularyTotal: number;
  hasGrammar: boolean;
  grammar: number;
  availablePracticeModes: readonly ActiveLessonPracticeMode[];
  completedModes: ReadonlySet<LessonProgressMode>;
  bestPracticeAccuracy: number;
  eligibleForSpeedTest: boolean;
}) {
  if (eligibleForSpeedTest) {
    return {
      label: "Speed Test đã sẵn sàng. Hãy bắt đầu thử thách phản xạ.",
      mode: null,
    };
  }
  if (vocabulary < 80) {
    const remaining = Math.max(
      1,
      Math.ceil(vocabularyTotal * 0.8) - learnedCount,
    );
    return {
      label: `Đánh dấu đã học thêm ${remaining} từ để tăng tiến độ nhanh nhất.`,
      mode: "flashcard" as const,
    };
  }
  if (hasGrammar && grammar < 100) {
    return {
      label: "Hoàn thành phần luyện tập ngữ pháp của bài học.",
      mode: "grammar" as const,
    };
  }
  const nextMode = availablePracticeModes.find(
    (mode) => !completedModes.has(mode),
  );
  if (nextMode) {
    return {
      label: `Hoàn thành ${modeLabels[nextMode]} để tiến gần hơn đến Speed Test.`,
      mode: nextMode,
    };
  }
  if (bestPracticeAccuracy < lessonPracticeAccuracyRequirement) {
    const retryMode = availablePracticeModes[0] ?? "quiz";
    return {
      label: `Luyện lại ${modeLabels[retryMode]} và đạt ít nhất ${lessonPracticeAccuracyRequirement}% chính xác.`,
      mode: retryMode,
    };
  }
  return {
    label: "Tiếp tục hoàn thành các hoạt động còn lại trong bài học.",
    mode: "flashcard" as const,
  };
}

const modeLabels: Record<ActiveLessonPracticeMode, string> = {
  quiz: "Trắc nghiệm",
  typing: "Gõ từ",
  matching: "Nối từ",
  dictation: "Chính tả",
  translation: "Dịch câu",
};

function percentage(value: number, total: number) {
  return clamp(Math.round((value / total) * 100), 0, 100);
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}
