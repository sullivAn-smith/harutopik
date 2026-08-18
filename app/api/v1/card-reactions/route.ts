import { getApiActor } from "@/lib/api/auth";
import { apiBackendError, apiError, apiSuccess } from "@/lib/api/responses";
import { getPublishedLessonRouteData } from "@/lib/data/published-catalog";
import {
  cardComboMultiplier,
  cardReactionFinishSchema,
  cardReactionRules,
  gradeCardAnswer,
  isCorrectCardAnswer,
  scoreCardAnswer,
  type CardReactionCard,
} from "@/lib/speed-test/card-reaction-domain";
import { calculateSpeedRating } from "@/lib/speed-test/domain";
import { isRankedSpeedLesson } from "@/lib/rankings/ranked-source";
import { getLessonLearningProgress } from "@/lib/data/lesson-progress";

export async function POST(request: Request) {
  const actor = await getApiActor(request);
  if (!actor) return apiError("UNAUTHENTICATED", "Bạn cần đăng nhập.", 401);
  const parsed = cardReactionFinishSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Kết quả Card Reaction không hợp lệ.", 422);
  const input = parsed.data;
  const lessonData = await getPublishedLessonRouteData(input.courseSlug, input.lessonSlug);
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
  if (input.ranked && !(await isRankedSpeedLesson(input.courseSlug, input.lessonSlug))) {
    return apiError("INVALID_RANKED_SOURCE", "Bài học xếp hạng tuần này đã thay đổi. Hãy mở lại từ bảng xếp hạng.", 409);
  }

  const allDirections = ["ko_vi", "vi_ko"] as const;
  const cardMap = new Map<string, CardReactionCard>(allDirections.flatMap((direction) => lessonData.lesson.vocabulary.map((item) => {
    const correctAnswer = direction === "ko_vi" ? item.vietnamese : item.korean;
    return [`card:${direction}:${item.id}`, {
      id: `card:${direction}:${item.id}`, vocabularyId: item.id, type: "word" as const,
      content: direction === "ko_vi" ? item.korean : item.vietnamese,
      korean: item.korean, vietnamese: item.vietnamese, direction, correctAnswer, options: [] as string[],
      acceptedAnswers: direction === "ko_vi" ? [item.vietnamese, ...(item.acceptedVietnameseAnswers ?? [])] : [item.korean, ...(item.acceptedKoreanAnswers ?? [])],
    }] as const;
  })));
  if (input.boardCardIds.some((id) => !cardMap.has(id))) return apiError("CARD_NOT_FOUND", "Board chứa thẻ không thuộc bài học.", 409);
  const boardDirections = new Set(input.boardCardIds.map((id) => cardMap.get(id)!.direction));
  if (input.direction !== "mixed" && [...boardDirections].some((direction) => direction !== input.direction)) {
    return apiError("INVALID_DIRECTION", "Chiều trả lời của board không hợp lệ.", 422);
  }
  if (input.direction === "mixed" && input.boardCardIds.length > 1 && boardDirections.size !== 2) {
    return apiError("INVALID_MIXED_BOARD", "Board Mixed phải có đủ hai chiều.", 422);
  }

  let lives = cardReactionRules.lives;
  let combo = 0;
  let bestCombo = 0;
  let score = 0;
  const cleared = new Set<string>();
  const weak = new Set<string>();
  let revengeCount = 0;
  let perfectCount = 0;
  const answers = [];
  for (const submitted of input.answers) {
    if (lives <= 0 || cleared.size === input.boardCardIds.length) return apiError("INVALID_SEQUENCE", "Có câu trả lời sau khi game kết thúc.", 422);
    const card = cardMap.get(submitted.cardId)!;
    if (cleared.has(card.id)) return apiError("CARD_ALREADY_CLEARED", "Thẻ đã clear không thể trả lời lại.", 422);
    const correct = isCorrectCardAnswer(submitted.userAnswer, card);
    const revenge = correct && weak.has(card.vocabularyId);
    combo = correct ? combo + 1 : 0;
    if (!correct) { lives -= 1; weak.add(card.vocabularyId); } else cleared.add(card.id);
    if (revenge) revengeCount += 1;
    bestCombo = Math.max(bestCombo, combo);
    const grade = gradeCardAnswer(input.mode, correct, submitted.reactionTimeMs);
    if (grade === "perfect") perfectCount += 1;
    const points = scoreCardAnswer(input.level, grade, combo, revenge);
    score += points;
    answers.push({
      questionId: card.id, vocabularyId: card.vocabularyId, userAnswer: submitted.userAnswer,
      reactionTimeMs: submitted.reactionTimeMs, position: submitted.position, prompt: card.content,
      expectedAnswer: card.correctAnswer, direction: card.direction, result: correct ? "correct" : "wrong",
      grade, points, streakMultiplier: cardComboMultiplier(combo), difficulty: cardReactionRules.levels[input.level].multiplier,
      revenge, answerWindowMs: input.mode === "choose" ? 2500 : 3500,
    });
  }
  const correctCount = answers.filter((answer) => answer.result === "correct").length;
  const wrongCount = answers.length - correctCount;
  const accuracy = answers.length ? Math.round(correctCount / answers.length * 10_000) / 100 : 0;
  const completed = cleared.size === input.boardCardIds.length;
  const elapsedMs = cardReactionRules.levels[input.level].seconds * 1000 - input.remainingMs;
  const rating = calculateSpeedRating({ accuracy, completed });

  const { data: previous } = await actor.supabase.from("speed_test_records")
    .select("highest_score,fastest_time_ms").eq("user_id", actor.user.id).eq("source_id", lessonData.lesson.id)
    .eq("game_type", "card_reaction").eq("difficulty_level", input.level).eq("answer_mode", input.mode)
    .eq("reaction_direction", input.direction).eq("scoring_version", cardReactionRules.version).maybeSingle();
  const previousScore = Number(previous?.highest_score ?? 0);
  const previousTime = previous?.fastest_time_ms == null ? Infinity : Number(previous.fastest_time_ms);

  const { data, error } = await actor.supabase.rpc("save_card_reaction_result", { p_attempt: {
    id: input.attemptId, lessonId: lessonData.lesson.id, lessonName: `Bài ${lessonData.lesson.order}: ${lessonData.lesson.title.vi}`.slice(0, 60),
    level: input.level, direction: input.direction === "mixed" ? "ko_vi" : input.direction,
    reactionDirection: input.direction, answerMode: input.mode,
    totalQuestions: input.boardCardIds.length, answeredCount: answers.length, correctCount, wrongCount, accuracy,
    bestCombo, rating, completed, questionIds: input.boardCardIds, startedAt: input.startedAt, finishedAt: input.finishedAt,
    score, totalTimeMs: elapsedMs, livesRemaining: lives, perfectCount, missCount: wrongCount,
    clearedCards: cleared.size, revengeCount, gameOver: !completed, scoringVersion: cardReactionRules.version,
  }, p_answers: answers });
  if (error) return apiBackendError(error, "Chưa thể lưu Card Reaction.");
  let ranking: unknown = null;
  if (input.ranked) {
    const { data: rankedData, error: rankedError } = await actor.supabase.rpc("register_ranked_speed_attempt", { p_attempt_id: input.attemptId });
    if (rankedError) {
      const limitReached = rankedError.message.includes("RANKED_DAILY_LIMIT");
      return apiError(
        limitReached ? "RANKED_DAILY_LIMIT" : "RANKED_SAVE_FAILED",
        limitReached ? "Bạn đã sử dụng đủ 3 lượt xếp hạng hôm nay." : "Kết quả đã được lưu nhưng chưa thể cập nhật bảng xếp hạng.",
        409,
      );
    }
    ranking = rankedData;
  }
  return apiSuccess({ ...data, score, accuracy, correctCount, wrongCount, bestCombo, perfectCount, clearedCards: cleared.size, revengeCount,
    personalBest: { fastestClear: completed && elapsedMs < previousTime, highestScore: score > previousScore }, ranking });
}
