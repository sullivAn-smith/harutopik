import { apiBackendError, apiError, apiSuccess } from "@/lib/api/responses";
import { getApiActor } from "@/lib/api/auth";
import { getPublishedLessonRouteData } from "@/lib/data/published-catalog";
import {
  audioReactionFinishSchema,
  audioReactionRules,
  createFlashReactionPool,
  createAudioReactionPool,
  gradeAudioReaction,
  isCorrectAudioReactionAnswer,
  scoreAudioReactionAnswer,
  streakMultiplier,
} from "@/lib/speed-test/audio-reaction-domain";
import { calculateSpeedRating } from "@/lib/speed-test/domain";

export async function POST(request: Request) {
  const actor = await getApiActor(request);
  if (!actor) return apiError("UNAUTHENTICATED", "Bạn cần đăng nhập.", 401);
  const parsed = audioReactionFinishSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Kết quả Audio Reaction chưa hợp lệ.", 422);
  const input = parsed.data;
  const lessonData = await getPublishedLessonRouteData(input.courseSlug, input.lessonSlug);
  if (!lessonData) return apiError("LESSON_NOT_FOUND", "Không tìm thấy bài học.", 404);

  const sourcePool = input.gameType === "flash_reaction"
    ? createFlashReactionPool(lessonData.lesson.vocabulary, input.direction)
    : createAudioReactionPool(lessonData.lesson.vocabulary);
  const questionMap = new Map(sourcePool.map((question) => [question.id, question]));
  if (input.questionIds.some((id) => !questionMap.has(id))) {
    return apiError("QUESTION_NOT_FOUND", "Một số câu hỏi không thuộc bài học này.", 409);
  }

  let lives: number = audioReactionRules.startingLives;
  let combo = 0;
  let bestCombo = 0;
  let score = 0;
  let answeredAfterGameOver = false;
  const counts = { perfect: 0, great: 0, good: 0, miss: 0 };
  const answers = input.answers.map((answer) => {
    if (lives === 0) answeredAfterGameOver = true;
    const question = questionMap.get(answer.questionId)!;
    const withinWindow = answer.reactionTimeMs <= audioReactionRules.answerWindowMs[input.mode];
    const correct = withinWindow && isCorrectAudioReactionAnswer(answer.userAnswer, question);
    combo = correct ? combo + 1 : 0;
    if (!correct) lives = Math.max(0, lives - 1);
    bestCombo = Math.max(bestCombo, combo);
    const grade = gradeAudioReaction(input.mode, correct, answer.reactionTimeMs);
    const points = scoreAudioReactionAnswer(question, grade, combo);
    score += points;
    counts[grade] += 1;
    return {
      questionId: question.id,
      vocabularyId: question.vocabularyId,
      exampleId: question.exampleId,
      userAnswer: answer.userAnswer,
      reactionTimeMs: answer.reactionTimeMs,
      position: answer.position,
      prompt: question.korean,
      expectedAnswer: question.correctAnswer,
      questionType: question.type,
      result: correct ? "correct" : "wrong",
      grade,
      points,
      streakMultiplier: streakMultiplier(combo),
      difficulty: question.difficulty,
      answerWindowMs: audioReactionRules.answerWindowMs[input.mode],
    };
  });
  if (answeredAfterGameOver) {
    return apiError("INVALID_GAME_OVER", "Phiên chơi chứa câu trả lời sau khi đã hết mạng.", 422);
  }
  const correctCount = answers.filter((answer) => answer.result === "correct").length;
  const wrongCount = answers.length - correctCount;
  const accuracy = answers.length ? Math.round((correctCount / answers.length) * 10_000) / 100 : 0;
  const completed = answers.length === input.questionIds.length;
  const gameOver = lives === 0 && !completed;
  const rating = calculateSpeedRating({ accuracy, completed });

  const { data: previousRows } = await actor.supabase
    .from("speed_test_attempts")
    .select("score,total_time_ms,accuracy,finish_reason")
    .eq("user_id", actor.user.id)
    .eq("source_kind", "lesson")
    .eq("source_id", lessonData.lesson.id)
    .eq("game_type", input.gameType)
    .eq("answer_mode", input.mode)
    .eq("requested_question_count", String(input.requestedQuestionCount));
  const previousHighestScore = Math.max(0, ...(previousRows ?? []).map((row) => Number(row.score ?? 0)));
  const previousFastestTime = Math.min(Infinity, ...(previousRows ?? []).filter((row) => row.finish_reason === "completed" && Number(row.accuracy) === 100).map((row) => Number(row.total_time_ms)));

  const { data, error } = await actor.supabase.rpc("save_audio_reaction_result", {
    p_attempt: {
      id: input.attemptId,
      lessonId: lessonData.lesson.id,
      lessonName: `Bài ${lessonData.lesson.order}: ${lessonData.lesson.title.vi}`.slice(0, 60),
      mode: input.mode,
      gameType: input.gameType,
      direction: input.direction,
      requestedQuestionCount: String(input.requestedQuestionCount),
      totalQuestions: input.questionIds.length,
      answeredCount: answers.length,
      correctCount,
      wrongCount,
      accuracy,
      bestCombo,
      rating,
      completed,
      questionIds: input.questionIds,
      startedAt: input.startedAt,
      finishedAt: input.finishedAt,
      score,
      totalTimeMs: input.totalTimeMs,
      livesRemaining: lives,
      perfectCount: counts.perfect,
      greatCount: counts.great,
      goodCount: counts.good,
      missCount: counts.miss,
      gameOver,
      scoringVersion: audioReactionRules.version,
    },
    p_answers: answers,
  });
  if (error) return apiBackendError(error, "Chưa thể lưu kết quả Audio Reaction.");
  return apiSuccess({
    ...data,
    score,
    accuracy,
    correctCount,
    wrongCount,
    bestCombo,
    livesRemaining: lives,
    counts,
    personalBest: {
      highestScore: score > previousHighestScore,
      previousScore: previousHighestScore,
      improvement: Math.max(0, score - previousHighestScore),
      fastestPerfect: completed && accuracy === 100 && input.totalTimeMs < previousFastestTime,
    },
  });
}
