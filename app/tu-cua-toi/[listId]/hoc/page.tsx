import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { lessonSchema } from "@/content/schema";
import { LessonExperience } from "@/features/lesson/lesson-experience";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Học bộ từ" };
export const dynamic = "force-dynamic";

function safeLessonHref(value: string | undefined) {
  return value?.startsWith("/courses/") ? value : "/courses/topik-1";
}

export default async function StudyVocabularyListPage({
  params,
  searchParams,
}: {
  params: Promise<{ listId: string }>;
  searchParams: Promise<{ back?: string }>;
}) {
  if (!isSupabaseConfigured()) redirect("/dang-nhap");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/dang-nhap");

  const { listId } = await params;
  const { back } = await searchParams;
  const lessonHref = safeLessonHref(back);
  const managerHref = `/tu-cua-toi?back=${encodeURIComponent(lessonHref)}`;

  const { data: list } = await supabase
    .from("vocabulary_lists")
    .select("id,name")
    .eq("id", listId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!list) notFound();

  const { data: items } = await supabase
    .from("vocabulary_list_items")
    .select("snapshot,created_at")
    .eq("list_id", listId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (!items?.length) {
    return (
      <main className="elegant-blue flex min-h-screen items-center justify-center px-5 py-12">
        <section className="w-full max-w-xl rounded-[2rem] border border-white/70 bg-white/80 p-8 text-center shadow-xl backdrop-blur">
          <span className="text-5xl">📚</span>
          <h1 className="mt-5 text-3xl font-black text-ink-900">
            Bộ từ đang trống
          </h1>
          <p className="mt-3 text-ink-600">
            Hãy lưu ít nhất một từ từ bài học trước khi bắt đầu luyện tập.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href={managerHref}
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 font-black text-brand-700"
            >
              ← Bộ từ của tôi
            </Link>
            <Link
              href={lessonHref}
              className="rounded-xl bg-brand-600 px-5 py-3 font-black text-white"
            >
              Tìm từ trong bài học
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const parsed = lessonSchema.safeParse({
    id: `vocabulary-list-${list.id}`,
    slug: list.id,
    courseId: "personal-vocabulary",
    moduleId: "personal-vocabulary",
    order: 1,
    version: 1,
    status: "published",
    title: { vi: list.name, ko: "나의 단어장" },
    summary: `Luyện tập ${items.length} từ trong bộ ${list.name}.`,
    objectives: ["Ghi nhớ và vận dụng các từ đã lưu."],
    vocabulary: items.map((item) => item.snapshot),
    grammar: [],
    exercises: [],
  });
  if (!parsed.success) notFound();

  return (
    <LessonExperience
      lesson={parsed.data}
      previewMode
      allowedModes={[
        "flashcard",
        "quiz",
        "typing",
        "matching",
        "dictation",
        "translation",
      ]}
      backHref={managerHref}
      backLabel="Bộ từ của tôi"
      vocabularyOnly
      contextLabel="Bộ từ cá nhân"
      statusLabel="LUYỆN BỘ TỪ"
      speedTestHref={`/speed-test?listId=${list.id}`}
    />
  );
}
