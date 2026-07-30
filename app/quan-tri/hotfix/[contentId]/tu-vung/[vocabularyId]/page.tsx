import Link from "next/link";
import { notFound } from "next/navigation";
import { PublishedVocabularyHotfixForm } from "@/features/admin/published-vocabulary-hotfix-form";
import { GenerateAudioButton } from "@/features/vocabulary-admin/generate-audio-button";
import { getPublishedLessonForHotfix } from "@/lib/data/admin";
import { getVocabularyAdminItem } from "@/lib/data/vocabulary-admin";

export default async function AdminVocabularyHotfixPage({
  params,
  searchParams,
}: {
  params: Promise<{ contentId: string; vocabularyId: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { contentId, vocabularyId } = await params;
  const [published, item, notice] = await Promise.all([
    getPublishedLessonForHotfix(contentId),
    getVocabularyAdminItem(vocabularyId),
    searchParams,
  ]);
  if (
    !published ||
    !item ||
    !published.lesson.vocabulary.some((word) => word.id === vocabularyId)
  ) notFound();
  return (
    <main className="mx-auto max-w-5xl px-5 py-10 lg:px-8">
      <Link href={`/quan-tri/hotfix/${contentId}`} className="font-black text-violet-700">
        ← Hotfix {published.lesson.title.vi}
      </Link>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-4 rounded-3xl bg-[#10243e] p-7 text-white">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-cyan-200">Từ vựng đang phát hành</p>
          <h1 lang="ko" className="mt-2 text-5xl font-black">{item.hangul}</h1>
          <p className="mt-2 text-xl font-black text-orange-300">{item.meaningVi}</p>
        </div>
        <GenerateAudioButton vocabularyId={item.id} currentAudioUrl={item.audioUrl} />
      </div>
      {notice.saved === "1" && (
        <p role="status" className="mt-6 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-800">
          Đã cập nhật từ vựng. Nếu đổi tiếng Hàn, hãy tạo lại audio Azure phía trên.
        </p>
      )}
      <section className="mt-7">
        <PublishedVocabularyHotfixForm contentId={contentId} item={item} />
      </section>
    </main>
  );
}
