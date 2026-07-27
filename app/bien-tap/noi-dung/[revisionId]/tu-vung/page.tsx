import Link from "next/link";
import { notFound } from "next/navigation";
import { LessonVocabularyPicker } from "@/features/vocabulary-admin/lesson-vocabulary-picker";
import { getLessonRevision } from "@/lib/data/admin";
import { getVocabularyLibrary } from "@/lib/data/vocabulary-admin";

export default async function LessonVocabularyPage({
  params,
  searchParams,
}: {
  params: Promise<{ revisionId: string }>;
  searchParams: Promise<{ attach?: string }>;
}) {
  const { revisionId } = await params;
  const [revision, items] = await Promise.all([
    getLessonRevision(revisionId),
    getVocabularyLibrary(),
  ]);
  if (!revision || !["draft", "changes_requested"].includes(revision.status)) notFound();
  const { attach } = await searchParams;
  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <Link href={`/bien-tap/noi-dung/${revisionId}`} className="text-sm font-black text-brand-700">← Quay lại bài học</Link>
      <div className="mt-5"><p className="text-sm font-black uppercase tracking-widest text-brand-600">Bộ từ của bài</p><h1 className="mt-2 text-4xl font-black">{revision.lesson.title.vi}</h1><p className="mt-3 text-ink-600">Chọn từ đã có trong thư viện. Một từ có thể được dùng lại ở nhiều bài học.</p></div>
      {attach && <p className="mt-5 rounded-2xl bg-red-50 p-4 font-bold text-red-700">Chưa thể lưu bộ từ. Hãy tải lại và thử lại.</p>}
      <div className="mt-7"><LessonVocabularyPicker revisionId={revisionId} items={items} selectedIds={revision.lesson.vocabulary.map((item) => item.id)} /></div>
    </main>
  );
}
