import { apiBackendError, apiError, apiSuccess } from "@/lib/api/responses";
import { getApiActor } from "@/lib/api/auth";
import {
  calculateSpeedRating,
  classifySpeedTestAnswer,
  speedTestFinishSchema,
  speedTestRules,
  type SpeedTestVocabularySnapshot,
} from "@/lib/speed-test/domain";
import { vocabularyItemSchema } from "@/content/schema";
import { getPublishedLessonRouteData } from "@/lib/data/published-catalog";
import { recordStreakActivity } from "@/lib/streaks/record-activity";
import { getVietnamChallengeDate } from "@/lib/speed-test/daily";
import { getLessonLearningProgress } from "@/lib/data/lesson-progress";

export async function POST(request: Request) {
  const actor = await getApiActor(request);
  if (!actor) return apiError("UNAUTHENTICATED", "Bạn cần đăng nhập.", 401);

  const parsed = speedTestFinishSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Kết quả Speed Test chưa hợp lệ.", 422);
  }
  const input = parsed.data;
  if (input.dailyChallenge && input.challengeDate !== getVietnamChallengeDate()) {
    return apiError("INVALID_CHALLENGE_DATE", "Daily Challenge này không còn thuộc ngày hôm nay.", 409);
  }
  if (new Set(input.questionIds).size !== input.questionIds.length) {
    return apiError("DUPLICATE_QUESTIONS", "Danh sách câu hỏi bị trùng.", 422);
  }
  if (input.answers.some((answer, index) =>
    answer.position !== index + 1 || input.questionIds[index] !== answer.vocabularyId
  )) {
    return apiError("INVALID_ANSWER_ORDER", "Thứ tự câu trả lời chưa hợp lệ.", 422);
  }

  let sourceName = "Bài học";
  let sourceId = "";
  let listId: string | null = null;
  const snapshots = new Map<string, SpeedTestVocabularySnapshot>();

  if (input.source.kind === "list") {
    const [{ data: list, error: listError }, { data: rows, error: itemError }] = await Promise.all([
      actor.supabase
        .from("vocabulary_lists")
        .select("id,name")
        .eq("id", input.source.listId)
        .eq("user_id", actor.user.id)
        .maybeSingle(),
      actor.supabase
        .from("vocabulary_list_items")
        .select("vocabulary_id,snapshot")
        .eq("list_id", input.source.listId)
        .eq("user_id", actor.user.id)
        .in("vocabulary_id", input.questionIds),
    ]);
    if (listError || itemError) return apiBackendError(listError ?? itemError, "Chưa thể kiểm tra bộ từ.");
    if (!list) return apiError("LIST_NOT_FOUND", "Không tìm thấy bộ từ.", 404);
    sourceName = list.name;
    sourceId = list.id;
    listId = list.id;
    for (const row of rows ?? []) {
      const item = vocabularyItemSchema.safeParse(row.snapshot);
      if (item.success) snapshots.set(row.vocabulary_id, item.data);
    }
  } else {
    const lessonData = await getPublishedLessonRouteData(
      input.source.courseSlug,
      input.source.lessonSlug,
    );
    if (!lessonData) return apiError("LESSON_NOT_FOUND", "Không tìm thấy bài học.", 404);
    const lessonProgress = await getLessonLearningProgress({
      supabase: actor.supabase,
      userId: actor.user.id,
      lesson: lessonData.lesson,
    });
    if (!lessonProgress.speedTestUnlocked) {
      return apiError(
        "SPEED_TEST_LOCKED",
        `Bạn cần đạt ${lessonProgress.unlockThreshold}% tiến độ bài học để mở Speed Test.`,
        403,
        {
          completionPercent: lessonProgress.completionPercent,
          unlockThreshold: lessonProgress.unlockThreshold,
        },
      );
    }
    sourceName = `Bài ${lessonData.lesson.order}: ${lessonData.lesson.title.vi}`.slice(0, 60);
    sourceId = lessonData.lesson.id;
    for (const item of lessonData.lesson.vocabulary) snapshots.set(item.id, item);
  }
  if (input.questionIds.some((id) => !snapshots.has(id))) {
    return apiError("QUESTION_NOT_FOUND", "Một số từ không còn trong bộ từ.", 409);
  }

  let combo = 0;
  let bestCombo = 0;
  const answers = input.answers.map((answer) => {
    const item = snapshots.get(answer.vocabularyId)!;
    const result = classifySpeedTestAnswer(answer.userAnswer, item, input.direction);
    const correct = result === "correct";
    combo = correct ? combo + 1 : 0;
    bestCombo = Math.max(bestCombo, combo);
    return {
      ...answer,
      prompt: input.direction === "vi_ko" ? item.vietnamese : item.korean,
      expectedAnswer: input.direction === "vi_ko" ? item.korean : item.vietnamese,
      result,
    };
  });
  const correctCount = answers.filter((answer) => answer.result === "correct").length;
  const nearMissCount = answers.filter((answer) => answer.result === "near_miss").length;
  const wrongCount = answers.length - correctCount - nearMissCount;
  const accuracy = answers.length ? Math.round((correctCount / answers.length) * 10_000) / 100 : 0;
  const completed = input.finishedReason === "completed" && answers.length === input.questionIds.length;
  const rating = calculateSpeedRating({ accuracy, completed });

  const { data, error } = await actor.supabase.rpc("save_speed_test_result", {
    p_attempt: {
      id: input.attemptId,
      listId: listId ?? "",
      listName: sourceName,
      sourceKind: input.source.kind,
      sourceId,
      direction: input.direction,
      requestedQuestionCount: String(input.requestedQuestionCount),
      totalQuestions: input.questionIds.length,
      answeredCount: answers.length,
      correctCount,
      wrongCount,
      nearMissCount,
      accuracy,
      startingSeconds: speedTestRules.startingSeconds,
      remainingSeconds: input.remainingSeconds,
      bestCombo,
      rating,
      finishReason: completed ? "completed" : "timed_out",
      rulesVersion: speedTestRules.version,
      questionIds: input.questionIds,
      startedAt: input.startedAt,
      finishedAt: input.finishedAt,
      isDaily: input.dailyChallenge,
      challengeDate: input.dailyChallenge ? input.challengeDate : null,
    },
    p_answers: answers,
  });
  if (error) return apiBackendError(error, "Chưa thể lưu kết quả Speed Test.");
  let ranking: unknown = null;
  const { data: rankedData, error: rankedError } = await actor.supabase.rpc(
    "register_ranked_speed_attempt",
    { p_attempt_id: input.attemptId },
  );
  if (!rankedError) ranking = rankedData;
  let streakRecorded = false;
  if (input.dailyChallenge && completed) {
    const streak = await recordStreakActivity({
      userId: actor.user.id,
      completedAt: input.finishedAt,
      sourceType: "review",
      sourceId: `daily-speed-test:${input.attemptId}`,
    });
    streakRecorded = Boolean(streak);
  }
  return apiSuccess({
    ...data,
    correctCount,
    wrongCount,
    nearMissCount,
    accuracy,
    bestCombo,
    rating,
    dailyChallenge: input.dailyChallenge,
    streakRecorded,
    ranking,
  });
}
