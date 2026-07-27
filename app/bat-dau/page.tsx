import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/features/profile/profile-form";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Thiết lập lộ trình học" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  if (!isSupabaseConfigured()) redirect("/dang-nhap");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/dang-nhap");

  const { data: profile } = await supabase
    .from("learner_profiles")
    .select(
      "display_name,avatar_url,korean_level,learning_goal,daily_goal_minutes,timezone,onboarding_completed",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.onboarding_completed) redirect("/tai-khoan");

  const metadata = user.user_metadata;
  const identityName =
    metadata.display_name ?? metadata.full_name ?? metadata.name;

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10">
      <section className="surface-card mx-auto max-w-3xl bg-white p-7 sm:p-10">
        <p className="text-sm font-black uppercase tracking-widest text-brand-600">
          Chào mừng đến Harutopik
        </p>
        <h1 className="mt-2 text-3xl font-black text-ink-900 sm:text-4xl">
          Tạo lộ trình phù hợp với bạn
        </h1>
        <p className="mt-3 max-w-2xl text-ink-600">
          Chỉ mất khoảng một phút. Thông tin này giúp Harutopik đề xuất đúng
          bài, đặt mục tiêu vừa sức và đồng bộ cho cả website lẫn app sau này.
        </p>

        <ProfileForm
          mode="onboarding"
          defaults={{
            displayName:
              profile?.display_name ??
              (typeof identityName === "string" && identityName.trim()
                ? identityName.trim()
                : "Học viên Harutopik"),
            avatarUrl:
              profile?.avatar_url ??
              metadata.avatar_url ??
              metadata.picture ??
              null,
            koreanLevel: profile?.korean_level ?? "absolute_beginner",
            learningGoal: profile?.learning_goal ?? "topik",
            dailyGoalMinutes: profile?.daily_goal_minutes ?? 15,
            timezone: profile?.timezone ?? "Asia/Ho_Chi_Minh",
          }}
        />
      </section>
    </main>
  );
}
