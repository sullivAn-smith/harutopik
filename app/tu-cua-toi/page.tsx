import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { VocabularyListsManager } from "@/features/vocabulary-lists/vocabulary-lists-manager";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Bộ từ của tôi" };
export const dynamic = "force-dynamic";

function safeLessonHref(value: string | undefined) {
  return value?.startsWith("/courses/") ? value : "/courses/topik-1";
}

export default async function MyVocabularyPage({
  searchParams,
}: {
  searchParams: Promise<{ back?: string }>;
}) {
  if (!isSupabaseConfigured()) redirect("/dang-nhap");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/dang-nhap");
  const { back } = await searchParams;
  const backHref = safeLessonHref(back);

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10">
      <section className="surface-card mx-auto max-w-5xl bg-white p-7 sm:p-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              href={backHref}
              className="mb-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-brand-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-sky-50"
            >
              ← Quay lại bài đang học
            </Link>
            <p className="text-sm font-black uppercase tracking-widest text-brand-600">
              Thư viện cá nhân
            </p>
            <h1 className="mt-2 text-3xl font-black text-ink-900">
              Bộ từ của tôi
            </h1>
            <p className="mt-2 max-w-2xl text-ink-600">
              Tạo nhiều bộ từ theo mục tiêu, lưu từ ở bất kỳ bài học nào và ôn
              lại bằng flashcard.
            </p>
          </div>
          <Link
            href="/courses/topik-1"
            className="rounded-xl bg-sky-50 px-4 py-2.5 font-black text-brand-700"
          >
            Tìm từ trong bài học
          </Link>
        </div>
        <VocabularyListsManager backHref={backHref} />
      </section>
    </main>
  );
}
