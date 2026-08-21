import { apiError, apiSuccess } from "@/lib/api/responses";
import { getApiActor } from "@/lib/api/auth";
import { getPublishedLessonRouteData } from "@/lib/data/published-catalog";
import { getLessonLearningProgress } from "@/lib/data/lesson-progress";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return apiError(
      "AUTH_NOT_CONFIGURED",
      "Hệ thống tài khoản chưa được cấu hình.",
      503,
    );
  }

  const actor = await getApiActor(request);
  if (!actor) {
    return apiError("UNAUTHENTICATED", "Bạn cần đăng nhập.", 401);
  }

  const url = new URL(request.url);
  const lessonIdsParam = url.searchParams.get("lessonIds")?.trim();
  if (lessonIdsParam) {
    const lessonIds = [
      ...new Set(
        lessonIdsParam
          .split(",")
          .map((lessonId) => lessonId.trim())
          .filter(Boolean),
      ),
    ];
    if (lessonIds.length === 0 || lessonIds.length > 500) {
      return apiError(
        "INVALID_PROGRESS_QUERY",
        "Danh sách bài học không hợp lệ.",
        400,
      );
    }

    const { data, error } = await actor.supabase
      .from("lesson_progress")
      .select("lesson_id,completion_percent,speed_test_unlocked_at")
      .eq("user_id", actor.user.id)
      .in("lesson_id", lessonIds);
    if (error) {
      return apiError(
        "PROGRESS_READ_FAILED",
        "Chưa thể tải tiến độ bài học.",
        500,
      );
    }

    return apiSuccess(
      {
        progressByLessonId: Object.fromEntries(
          (data ?? []).map((row) => [
            row.lesson_id,
            {
              completionPercent: Number(row.completion_percent ?? 0),
              speedTestUnlocked: Boolean(row.speed_test_unlocked_at),
            },
          ]),
        ),
      },
      { cacheControl: "private, no-store" },
    );
  }

  const courseSlug = url.searchParams.get("courseSlug")?.trim();
  const lessonSlug = url.searchParams.get("lessonSlug")?.trim();
  if (!courseSlug || !lessonSlug) {
    return apiError(
      "INVALID_PROGRESS_QUERY",
      "Thiếu thông tin bài học.",
      400,
    );
  }

  const data = await getPublishedLessonRouteData(courseSlug, lessonSlug);
  if (!data) {
    return apiError("LESSON_NOT_FOUND", "Không tìm thấy bài học.", 404);
  }

  try {
    const progress = await getLessonLearningProgress({
      supabase: actor.supabase,
      userId: actor.user.id,
      lesson: data.lesson,
      persist: false,
    });
    return apiSuccess(progress, { cacheControl: "private, no-store" });
  } catch {
    return apiError(
      "PROGRESS_READ_FAILED",
      "Chưa thể tải tiến độ bài học.",
      500,
    );
  }
}
