import Link from "next/link";
import { notFound } from "next/navigation";
import { PublishedVocabularyHotfixForm } from "@/features/admin/published-vocabulary-hotfix-form";
import { GenerateAudioButton } from "@/features/vocabulary-admin/generate-audio-button";
import {
  getPublishedLessonForHotfix,
  getVocabularyDuplicateLocations,
} from "@/lib/data/admin";
import { getVocabularyAdminItem } from "@/lib/data/vocabulary-admin";

export default async function AdminVocabularyHotfixPage({
  params,
  searchParams,
}: {
  params: Promise<{ contentId: string; vocabularyId: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { contentId, vocabularyId } = await params;
  const [published, item, notice, duplicateLocations] = await Promise.all([
    getPublishedLessonForHotfix(contentId),
    getVocabularyAdminItem(vocabularyId),
    searchParams,
    getVocabularyDuplicateLocations(vocabularyId),
  ]);
  if (
    !published ||
    !item ||
    !published.lesson.vocabulary.some((word) => word.id === vocabularyId)
  ) notFound();
  const currentIndex = published.lesson.vocabulary.findIndex(
    (word) => word.id === vocabularyId,
  );
  const nextWord = published.lesson.vocabulary[currentIndex + 1];
  const nextHref = nextWord
    ? `/quan-tri/hotfix/${contentId}/tu-vung/${nextWord.id}`
    : `/quan-tri/hotfix/${contentId}`;
  return (
    <main className="mx-auto max-w-[1480px] px-5 py-6 lg:px-8">
      <Link href={`/quan-tri/hotfix/${contentId}`} className="font-black text-violet-700">
        ← Hotfix {published.lesson.title.vi}
      </Link>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-4 rounded-3xl bg-[#10243e] p-7 text-white">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs font-black uppercase tracking-widest text-cyan-200">Từ vựng đang phát hành</p>
            <span className="rounded-full border border-white/25 bg-white/12 px-4 py-1.5 text-sm font-black text-white shadow-sm">
              Từ {currentIndex + 1} / {published.lesson.vocabulary.length}
            </span>
          </div>
          <h1 lang="ko" className="mt-2 text-5xl font-black">{item.hangul}</h1>
          <p className="mt-2 text-xl font-black text-orange-300">{item.meaningVi}</p>
        </div>
        <GenerateAudioButton vocabularyId={item.id} currentAudioUrl={item.audioUrl} />
      </div>
      {notice.saved === "1" && (
        <div
          role="status"
          className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"
        >
          <p className="font-bold text-emerald-800">
            Đã cập nhật từ. Nếu đổi tiếng Hàn, hãy tạo lại audio phía trên.
          </p>
          <Link
            href={nextHref}
            className="inline-flex min-h-11 shrink-0 items-center rounded-xl bg-gradient-to-r from-violet-700 to-blue-600 px-5 py-2.5 font-black text-white shadow-[0_8px_18px_rgba(109,40,217,0.22)] transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            {nextWord ? "Từ tiếp theo →" : "Xong · Về danh sách"}
          </Link>
        </div>
      )}
      {duplicateLocations.length > 0 && (
        <aside className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950" role="status">
          <p className="font-black">
            Từ tiếng Hàn này đang bị trùng với {new Set(duplicateLocations.map((location) => location.vocabularyId)).size} mục khác trong thư viện.
          </p>
          <p className="mt-1 text-sm font-semibold">
            Admin vẫn được phép lưu trùng. Các luồng biên tập và import vẫn chặn từ trùng như cũ.
          </p>
          <ul className="mt-3 grid gap-2 text-sm font-bold sm:grid-cols-2">
            {duplicateLocations.map((location) => (
              <li key={`${location.vocabularyId}-${location.courseNumber}-${location.lessonNumber}`} className="rounded-xl bg-white/75 px-3 py-2">
                {location.courseNumber ? `Quyển ${location.courseNumber}` : location.courseTitle}
                {location.lessonNumber ? ` · Bài ${location.lessonNumber}` : ""}
                {` — ${location.lessonTitle}`}
                {location.meaningVi ? ` (${location.meaningVi})` : ""}
              </li>
            ))}
          </ul>
        </aside>
      )}
      <section className="mt-7">
        <PublishedVocabularyHotfixForm
          contentId={contentId}
          item={item}
          nextHref={nextHref}
        />
      </section>
    </main>
  );
}
