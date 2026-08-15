import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/features/auth/actions";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { getOwnEntitlementSummary } from "@/lib/data/entitlements";

export const metadata: Metadata = { title: "Hồ sơ học tập" };
export const dynamic = "force-dynamic";

const goalLabels: Record<string, string> = {
  daily_communication: "Giao tiếp",
  topik: "TOPIK",
  study_abroad: "Du học",
  work: "Công việc",
  culture: "Văn hoá",
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ onboarding?: string; profile?: string }>;
}) {
  if (!isSupabaseConfigured()) redirect("/dang-nhap");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/dang-nhap");
  const { data: profile } = await supabase
    .from("learner_profiles")
    .select(
      "display_name,avatar_url,learning_goal,daily_goal_minutes,onboarding_completed",
    )
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.onboarding_completed) redirect("/bat-dau");

  const entitlement = await getOwnEntitlementSummary();
  const status = await searchParams;

  const metadata = user.user_metadata;
  const identityName =
    metadata.display_name ?? metadata.full_name ?? metadata.name;
  const displayName =
    profile.display_name ??
    (typeof identityName === "string" && identityName.trim()
      ? identityName.trim()
      : "Học viên Harutopik");
  const avatarUrl =
    profile.avatar_url ?? metadata.avatar_url ?? metadata.picture ?? null;
  const notice =
    status.onboarding === "done"
      ? "Lộ trình học của bạn đã sẵn sàng."
      : status.profile === "updated"
        ? "Hồ sơ đã được cập nhật."
        : null;

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10">
      <section className="surface-card mx-auto max-w-3xl bg-white p-7 sm:p-10">
        {notice && (
          <p
            role="status"
            className="mb-6 rounded-2xl bg-emerald-50 px-4 py-3 font-bold text-emerald-800"
          >
            {notice}
          </p>
        )}
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-center gap-4">
            {avatarUrl ? (
              // The URL comes from the authenticated identity provider.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt=""
                className="h-16 w-16 rounded-2xl object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-sky-100 text-2xl font-black text-brand-700">
                {displayName.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
            <p className="text-sm font-black uppercase tracking-widest text-brand-600">
              Hồ sơ học tập
            </p>
            <h1 className="mt-2 text-3xl font-black text-ink-900">
              Xin chào, {displayName}
            </h1>
            <p className="mt-2 text-ink-600">{user.email}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/tai-khoan/chinh-sua"
              className="rounded-xl bg-sky-50 px-4 py-2 font-bold text-brand-700 hover:bg-sky-100"
            >
              Chỉnh sửa hồ sơ
            </Link>
            <form action={signOut}>
              <button className="rounded-xl border px-4 py-2 font-bold text-ink-600 hover:bg-slate-50">
                Đăng xuất
              </button>
            </form>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            ["0", "Ngày liên tiếp"],
            [`${profile.daily_goal_minutes} phút`, "Mục tiêu mỗi ngày"],
            [goalLabels[profile.learning_goal] ?? "TOPIK", "Mục tiêu hiện tại"],
          ].map(([value, label]) => (
            <div key={label} className="rounded-2xl bg-sky-50 p-5">
              <p className="text-2xl font-black text-brand-700">{value}</p>
              <p className="mt-1 text-sm font-semibold text-ink-600">{label}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-slate-50 p-5">
          <div>
            <p className="font-black">
              Gói hiện tại: {entitlement.isPro ? "Haru Pro" : "Haru Free"}
            </p>
            <p className="mt-1 text-sm text-ink-600">
              Quyền học được đồng bộ theo tài khoản trên mọi thiết bị.
            </p>
          </div>
        </div>

        <Link
          href="/courses/topik-1"
          className="mt-8 inline-flex rounded-2xl bg-brand-600 px-5 py-3 font-black text-white"
        >
          Tiếp tục học
        </Link>
        <Link
          href="/tu-cua-toi"
          className="ml-3 mt-8 inline-flex rounded-2xl bg-sky-50 px-5 py-3 font-black text-brand-700"
        >
          Bộ từ của tôi
        </Link>
      </section>
    </main>
  );
}
