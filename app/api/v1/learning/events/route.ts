import { apiError, apiSuccess } from "@/lib/api/responses";
import { getApiActor } from "@/lib/api/auth";
import { learningEventSchema } from "@/lib/learning-core/progress-schema";
import {
  newReviewCard,
  scheduleReview,
  type ReviewCard,
} from "@/lib/learning-core/srs";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return apiError(
      "AUTH_NOT_CONFIGURED",
      "Hệ thống tài khoản chưa được cấu hình.",
      503,
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = learningEventSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      "INVALID_EVENT",
      "Sự kiện học không hợp lệ.",
      400,
      parsed.error.flatten().fieldErrors,
    );
  }

  const actor = await getApiActor(request);
  if (!actor) {
    return apiError("UNAUTHENTICATED", "Bạn cần đăng nhập.", 401);
  }
  const { supabase, user } = actor;

  const event = parsed.data;
  const { error: eventError } = await supabase.from("learning_events").insert({
      id: event.eventId,
      user_id: user.id,
      event_type: event.eventType,
      lesson_id: event.lessonId,
      lesson_version: event.lessonVersion,
      mode: event.mode,
      score: event.score ?? null,
      total: event.total ?? null,
      duration_seconds: event.durationSeconds,
      completed_at: event.completedAt,
    });

  if (eventError?.code === "23505") {
    return apiSuccess({
      accepted: true,
      duplicate: true,
      eventId: event.eventId,
    });
  }
  if (eventError) return databaseError();

  if (event.eventType === "practice_completed") {
    const percentage =
      event.score !== undefined && event.total
        ? Math.round((event.score / event.total) * 100)
        : null;
    const { data: currentProgress } = await supabase
      .from("lesson_progress")
      .select("best_score")
      .eq("user_id", user.id)
      .eq("lesson_id", event.lessonId)
      .maybeSingle();
    const bestScore =
      percentage === null
        ? currentProgress?.best_score ?? null
        : Math.max(percentage, currentProgress?.best_score ?? 0);
    const { data: completedPractices, error: practicesError } = await supabase
      .from("learning_events")
      .select("mode")
      .eq("user_id", user.id)
      .eq("lesson_id", event.lessonId)
      .eq("lesson_version", event.lessonVersion)
      .eq("event_type", "practice_completed");
    if (practicesError) return databaseError();
    const completedModes = new Set(
      (completedPractices ?? []).map((practice) => practice.mode),
    );
    const grammarCompleted = completedModes.has("grammar");
    const vocabularyCompleted = [...completedModes].some(
      (mode) => mode !== "grammar",
    );
    const lessonCompleted = grammarCompleted && vocabularyCompleted;
    const { error } = await supabase.from("lesson_progress").upsert(
      {
        user_id: user.id,
        lesson_id: event.lessonId,
        lesson_version: event.lessonVersion,
        status: lessonCompleted ? "completed" : "in_progress",
        best_score: bestScore,
        last_studied_at: event.completedAt,
        completed_at: lessonCompleted ? event.completedAt : null,
      },
      { onConflict: "user_id,lesson_id" },
    );
    if (error) return databaseError();
  }

  for (const review of event.reviews) {
    const { data: existing } = await supabase
      .from("review_cards")
      .select("state,difficulty,stability_days,reps,lapses")
      .eq("user_id", user.id)
      .eq("content_id", review.contentId)
      .maybeSingle();
    const card: ReviewCard = existing
      ? {
          state: existing.state,
          difficulty: existing.difficulty,
          stabilityDays: existing.stability_days,
          reps: existing.reps,
          lapses: existing.lapses,
        }
      : newReviewCard;
    const schedule = scheduleReview(
      card,
      review.rating,
      new Date(event.completedAt),
    );
    const { error } = await supabase.from("review_cards").upsert(
      {
        user_id: user.id,
        content_id: review.contentId,
        lesson_id: event.lessonId,
        state: schedule.state,
        difficulty: schedule.difficulty,
        stability_days: schedule.stabilityDays,
        interval_days: schedule.intervalDays,
        reps: schedule.reps,
        lapses: schedule.lapses,
        due_at: schedule.dueAt,
        last_reviewed_at: schedule.lastReviewedAt,
      },
      { onConflict: "user_id,content_id" },
    );
    if (error) return databaseError();
  }

  return apiSuccess({ accepted: true, eventId: event.eventId });
}

function databaseError() {
  return apiError("DATABASE_ERROR", "Không thể lưu tiến độ học.", 500);
}
