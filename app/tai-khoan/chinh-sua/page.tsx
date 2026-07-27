import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/features/profile/profile-form";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Chỉnh sửa hồ sơ" };
export const dynamic = "force-dynamic";

export default async function EditProfilePage() {
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

  if (!profile?.onboarding_completed) redirect("/bat-dau");

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10">
      <section className="surface-card mx-auto max-w-3xl bg-white p-7 sm:p-10">
        <Link
          href="/tai-khoan"
          className="text-sm font-bold text-brand-700 hover:underline"
        >
          ← Quay lại hồ sơ
        </Link>
        <h1 className="mt-4 text-3xl font-black text-ink-900">
          Chỉnh sửa hồ sơ
        </h1>
        <p className="mt-2 text-ink-600">
          Cập nhật mục tiêu để các gợi ý học luôn phù hợp với bạn.
        </p>
        <ProfileForm
          mode="edit"
          defaults={{
            displayName: profile.display_name,
            avatarUrl: profile.avatar_url,
            koreanLevel: profile.korean_level,
            learningGoal: profile.learning_goal,
            dailyGoalMinutes: profile.daily_goal_minutes,
            timezone: profile.timezone,
          }}
        />
      </section>
    </main>
  );
}
