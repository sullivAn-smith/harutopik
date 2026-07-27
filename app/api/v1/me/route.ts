import { apiError, apiSuccess } from "@/lib/api/responses";
import { getApiActor } from "@/lib/api/auth";
import { profileUpdateSchema } from "@/lib/auth/schema";
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

  const { data } = await actor.supabase
    .from("learner_profiles")
    .select(
      "display_name,avatar_url,native_language,korean_level,learning_goal,daily_goal_minutes,timezone,onboarding_completed,onboarding_completed_at,created_at,updated_at",
    )
    .eq("id", actor.user.id)
    .maybeSingle();

  return apiSuccess({
    id: actor.user.id,
    email: actor.user.email ?? null,
    displayName:
      data?.display_name ??
      actor.user.user_metadata.display_name ??
      actor.user.user_metadata.full_name ??
      actor.user.user_metadata.name ??
      "Học viên Harutopik",
    avatarUrl:
      data?.avatar_url ??
      actor.user.user_metadata.avatar_url ??
      actor.user.user_metadata.picture ??
      null,
    nativeLanguage: data?.native_language ?? "vi",
    koreanLevel: data?.korean_level ?? "absolute_beginner",
    learningGoal: data?.learning_goal ?? "topik",
    dailyGoalMinutes: data?.daily_goal_minutes ?? 15,
    timezone: data?.timezone ?? "Asia/Ho_Chi_Minh",
    onboardingCompleted: data?.onboarding_completed ?? false,
    onboardingCompletedAt: data?.onboarding_completed_at ?? null,
  });
}

export async function PATCH(request: Request) {
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

  const body = await request.json().catch(() => null);
  const parsed = profileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Thông tin hồ sơ chưa hợp lệ.",
      422,
      parsed.error.flatten().fieldErrors,
    );
  }

  const updatedAt = new Date().toISOString();
  const { error } = await actor.supabase
    .from("learner_profiles")
    .update({
      display_name: parsed.data.displayName,
      korean_level: parsed.data.koreanLevel,
      learning_goal: parsed.data.learningGoal,
      daily_goal_minutes: parsed.data.dailyGoalMinutes,
      timezone: parsed.data.timezone,
      onboarding_completed: true,
      onboarding_completed_at: updatedAt,
      updated_at: updatedAt,
    })
    .eq("id", actor.user.id);

  if (error) {
    return apiError(
      "PROFILE_UPDATE_FAILED",
      "Chưa thể cập nhật hồ sơ.",
      500,
    );
  }

  await actor.supabase.auth.updateUser({
    data: { display_name: parsed.data.displayName },
  });

  return apiSuccess({
    updated: true,
    onboardingCompleted: true,
    updatedAt,
  });
}
