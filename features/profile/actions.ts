"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  profileFormSchema,
  type ProfileFormState,
} from "@/lib/auth/schema";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(
  _state: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const parsed = profileFormSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) {
    return {
      status: "error",
      message: "Hãy kiểm tra lại các thông tin bên dưới.",
      fields: parsed.error.flatten().fieldErrors,
    };
  }
  if (!isSupabaseConfigured()) {
    return {
      status: "error",
      message: "Hệ thống tài khoản chưa được kết nối.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/dang-nhap");

  const completedAt = new Date().toISOString();
  const { error } = await supabase
    .from("learner_profiles")
    .update({
      display_name: parsed.data.displayName,
      korean_level: parsed.data.koreanLevel,
      learning_goal: parsed.data.learningGoal,
      daily_goal_minutes: parsed.data.dailyGoalMinutes,
      timezone: parsed.data.timezone,
      onboarding_completed: true,
      onboarding_completed_at: completedAt,
      updated_at: completedAt,
    })
    .eq("id", user.id);

  if (error) {
    return {
      status: "error",
      message: "Chưa thể lưu hồ sơ. Vui lòng thử lại.",
    };
  }

  await supabase.auth.updateUser({
    data: { display_name: parsed.data.displayName },
  });

  revalidatePath("/");
  revalidatePath("/tai-khoan");
  revalidatePath("/tai-khoan/chinh-sua");
  redirect(
    parsed.data.intent === "onboarding"
      ? "/tai-khoan?onboarding=done"
      : "/tai-khoan?profile=updated",
  );
}
