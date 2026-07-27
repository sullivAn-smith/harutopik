import { apiError, apiSuccess } from "@/lib/api/responses";
import { getApiActor } from "@/lib/api/auth";
import {
  studySessionStateSchema,
  studySessionUpsertSchema,
} from "@/lib/learning-core/study-session-schema";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return apiError("AUTH_NOT_CONFIGURED", "Hệ thống chưa được cấu hình.", 503);
  }

  const actor = await getApiActor(request);
  if (!actor) return apiError("UNAUTHENTICATED", "Bạn cần đăng nhập.", 401);

  const url = new URL(request.url);
  const lessonId = url.searchParams.get("lessonId");
  const lessonVersion = Number(url.searchParams.get("lessonVersion"));
  if (!lessonId || !Number.isInteger(lessonVersion) || lessonVersion < 1) {
    return apiError("INVALID_QUERY", "Thông tin bài học không hợp lệ.", 400);
  }

  const { data, error } = await actor.supabase
    .from("study_sessions")
    .select("state,updated_at")
    .eq("user_id", actor.user.id)
    .eq("lesson_id", lessonId)
    .eq("lesson_version", lessonVersion)
    .maybeSingle();

  if (error) return databaseError();
  if (!data) return apiSuccess({ session: null });

  const state = studySessionStateSchema.safeParse(data.state);
  return apiSuccess({
    session: state.success
      ? { state: state.data, updatedAt: data.updated_at }
      : null,
  });
}

export async function PUT(request: Request) {
  if (!isSupabaseConfigured()) {
    return apiError("AUTH_NOT_CONFIGURED", "Hệ thống chưa được cấu hình.", 503);
  }

  const actor = await getApiActor(request);
  if (!actor) return apiError("UNAUTHENTICATED", "Bạn cần đăng nhập.", 401);

  const body = await request.json().catch(() => null);
  const parsed = studySessionUpsertSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      "INVALID_SESSION",
      "Phiên học không hợp lệ.",
      400,
      parsed.error.flatten().fieldErrors,
    );
  }

  const { lessonId, lessonVersion, state } = parsed.data;
  const { error } = await actor.supabase.from("study_sessions").upsert(
    {
      user_id: actor.user.id,
      lesson_id: lessonId,
      lesson_version: lessonVersion,
      mode: state.mode,
      state,
      updated_at: state.updatedAt,
    },
    { onConflict: "user_id,lesson_id" },
  );

  if (error) return databaseError();
  return apiSuccess({ saved: true, updatedAt: state.updatedAt });
}

export async function DELETE(request: Request) {
  if (!isSupabaseConfigured()) {
    return apiError("AUTH_NOT_CONFIGURED", "Hệ thống chưa được cấu hình.", 503);
  }

  const actor = await getApiActor(request);
  if (!actor) return apiError("UNAUTHENTICATED", "Bạn cần đăng nhập.", 401);

  const url = new URL(request.url);
  const lessonId = url.searchParams.get("lessonId");
  if (!lessonId) {
    return apiError("INVALID_QUERY", "Thiếu mã bài học.", 400);
  }

  const { error } = await actor.supabase
    .from("study_sessions")
    .delete()
    .eq("user_id", actor.user.id)
    .eq("lesson_id", lessonId);
  if (error) return databaseError();

  return apiSuccess({ deleted: true });
}

function databaseError() {
  return apiError("DATABASE_ERROR", "Không thể xử lý phiên học.", 500);
}
