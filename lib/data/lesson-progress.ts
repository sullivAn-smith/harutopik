import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Lesson } from "@/content/schema";
import {
  calculateLessonProgress,
  lessonProgressModes,
  type ActiveLessonPracticeMode,
  type LessonProgressComponents,
  type LessonProgressMode,
  type LessonProgressSnapshot,
} from "@/lib/learning-core/lesson-progress";
import { generateLessonPractice } from "@/lib/learning-core/practice-generator";

type LessonProgressOptions = {
  supabase: SupabaseClient;
  userId: string;
  lesson: Lesson;
  persist?: boolean;
  activityAt?: string;
};

type LessonProgressPercentagesOptions = {
  supabase: SupabaseClient;
  userId: string;
  lessonIds: readonly string[];
};

type StoredProgressRow = {
  lesson_version: number | null;
  completion_percent: number | null;
  progress_components: unknown;
  speed_test_unlocked_at: string | null;
  completed_at: string | null;
};

type LessonSpeedTestAccessOptions = {
  supabase: SupabaseClient;
  userId: string;
  lesson: Lesson;
};

/**
 * Fast path for opening Speed Test. Progress is recalculated and persisted
 * whenever learning activity is recorded, so a current stored snapshot is
 * enough to decide the UI gate. Old or incomplete rows are refreshed once.
 *
 * The Speed Test result APIs still recalculate this state before accepting a
 * result, so this read optimization never weakens the server-side lock.
 */
export async function getLessonSpeedTestAccess({
  supabase,
  userId,
  lesson,
}: LessonSpeedTestAccessOptions) {
  const { data, error } = await supabase
    .from("lesson_progress")
    .select("lesson_version,progress_components,speed_test_unlocked_at")
    .eq("user_id", userId)
    .eq("lesson_id", lesson.id)
    .maybeSingle();
  if (error) throw error;

  const stored = data as Pick<
    StoredProgressRow,
    "lesson_version" | "progress_components" | "speed_test_unlocked_at"
  > | null;
  if (
    stored?.lesson_version === lesson.version &&
    parseStoredComponents(stored.progress_components)
  ) {
    return { speedTestUnlocked: Boolean(stored.speed_test_unlocked_at) };
  }

  const refreshed = await getLessonLearningProgress({
    supabase,
    userId,
    lesson,
  });
  return { speedTestUnlocked: refreshed.speedTestUnlocked };
}

export async function getLessonLearningProgress({
  supabase,
  userId,
  lesson,
  persist = true,
  activityAt,
}: LessonProgressOptions): Promise<LessonProgressSnapshot> {
  const vocabularyIds = lesson.vocabulary.map((item) => item.id);
  const practiceBundle = generateLessonPractice(lesson);
  const availablePracticeModes = [
    practiceBundle.quiz.length ? "quiz" : null,
    practiceBundle.typing.length ? "typing" : null,
    practiceBundle.matching.length ? "matching" : null,
    practiceBundle.dictations.length ? "dictation" : null,
    practiceBundle.translations.length ? "translation" : null,
  ].filter(
    (mode): mode is ActiveLessonPracticeMode => mode !== null,
  );
  const hasGrammar =
    lesson.grammar.length > 0 ||
    lesson.exercises.some((exercise) => exercise.type === "fill-blank");

  const [storedResult, reviewsResult, practicesResult] = await Promise.all([
    supabase
      .from("lesson_progress")
      .select(
        "lesson_version,completion_percent,progress_components,speed_test_unlocked_at,completed_at",
      )
      .eq("user_id", userId)
      .eq("lesson_id", lesson.id)
      .maybeSingle(),
    vocabularyIds.length
      ? supabase
          .from("review_cards")
          .select("content_id,state")
          .eq("user_id", userId)
          .eq("lesson_id", lesson.id)
          .in("content_id", vocabularyIds)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("learning_events")
      .select("mode,score,total")
      .eq("user_id", userId)
      .eq("lesson_id", lesson.id)
      .eq("lesson_version", lesson.version)
      .eq("event_type", "practice_completed"),
  ]);

  const queryError =
    storedResult.error ?? reviewsResult.error ?? practicesResult.error;
  if (queryError) throw queryError;

  const stored = storedResult.data as StoredProgressRow | null;
  const learnedVocabularyIds = (reviewsResult.data ?? [])
    .filter((review) => review.state === "review")
    .map((review) => review.content_id);
  const practices = (practicesResult.data ?? []).flatMap((practice) => {
    if (!isLessonProgressMode(practice.mode)) return [];
    return [{
      mode: practice.mode,
      score: typeof practice.score === "number" ? practice.score : null,
      total: typeof practice.total === "number" ? practice.total : null,
    }];
  });
  const calculated = calculateLessonProgress({
    vocabularyIds,
    learnedVocabularyIds,
    hasGrammar,
    availablePracticeModes,
    practices,
  });
  const previousPercent = clampPercent(stored?.completion_percent ?? 0);
  const completionPercent = Math.max(
    previousPercent,
    calculated.completionPercent,
  );
  const components =
    previousPercent > calculated.completionPercent
      ? parseStoredComponents(stored?.progress_components) ??
        calculated.components
      : calculated.components;
  const unlockedAt =
    stored?.speed_test_unlocked_at ??
    (calculated.eligibleForSpeedTest
      ? activityAt ?? new Date().toISOString()
      : null);
  const snapshot: LessonProgressSnapshot = {
    completionPercent,
    unlockThreshold: calculated.unlockThreshold,
    speedTestUnlocked: Boolean(unlockedAt),
    unlockedAt,
    bestPracticeAccuracy: calculated.bestPracticeAccuracy,
    completedModes: calculated.completedModes,
    components,
    recommendation: unlockedAt
      ? "Speed Test đã sẵn sàng. Hãy bắt đầu thử thách phản xạ."
      : calculated.recommendation,
    recommendedMode: unlockedAt ? null : calculated.recommendedMode,
  };

  if (persist) {
    const completedAt =
      completionPercent >= 100
        ? stored?.completed_at ?? activityAt ?? new Date().toISOString()
        : stored?.completed_at ?? null;
    const progressRow: Record<string, unknown> = {
      user_id: userId,
      lesson_id: lesson.id,
      lesson_version: lesson.version,
      status: completionPercent >= 100
        ? "completed"
        : completionPercent > 0
          ? "in_progress"
          : "not_started",
      completion_percent: completionPercent,
      progress_components: components,
      speed_test_unlocked_at: unlockedAt,
      completed_at: completedAt,
      updated_at: new Date().toISOString(),
    };
    if (activityAt) progressRow.last_studied_at = activityAt;

    const { error } = await supabase
      .from("lesson_progress")
      .upsert(progressRow, { onConflict: "user_id,lesson_id" });
    if (error) throw error;
  }

  return snapshot;
}

export async function getLessonProgressPercentages({
  supabase,
  userId,
  lessonIds,
}: LessonProgressPercentagesOptions): Promise<Record<string, number>> {
  if (lessonIds.length === 0) return {};

  const { data, error } = await supabase
    .from("lesson_progress")
    .select("lesson_id,completion_percent,status")
    .eq("user_id", userId)
    .in("lesson_id", [...lessonIds]);
  if (error) throw error;

  return Object.fromEntries(
    (data ?? []).map((row) => [
      row.lesson_id,
      row.status === "completed"
        ? 100
        : clampPercent(row.completion_percent ?? 0),
    ]),
  );
}

function isLessonProgressMode(value: unknown): value is LessonProgressMode {
  return (
    typeof value === "string" &&
    lessonProgressModes.includes(value as LessonProgressMode)
  );
}

function parseStoredComponents(value: unknown): LessonProgressComponents | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const components = value as Record<string, unknown>;
  if (
    !isPercent(components.vocabulary) ||
    !isPercent(components.grammar) ||
    !isPercent(components.practice) ||
    !isPercent(components.accuracy)
  ) {
    return null;
  }
  return {
    vocabulary: components.vocabulary,
    grammar: components.grammar,
    practice: components.practice,
    accuracy: components.accuracy,
  };
}

function isPercent(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 100
  );
}

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, Math.round(Number(value) || 0)));
}
