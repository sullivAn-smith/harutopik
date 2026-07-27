import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { VocabularyListsManager } from "@/features/vocabulary-lists/vocabulary-lists-manager";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Bộ từ của tôi" };
export const dynamic = "force-dynamic";

export default async function MyVocabularyPage() {
  if (!isSupabaseConfigured()) redirect("/dang-nhap");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/dang-nhap");

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10">
      <section className="surface-card mx-auto max-w-5xl bg-white p-7 sm:p-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
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
        <VocabularyListsManager />
      </section>
    </main>
  );
}
