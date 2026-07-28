import Link from "next/link";
import { notFound } from "next/navigation";
import { LessonDraftForm, type LessonDraftDefaults } from "@/features/admin/lesson-draft-form";
import { StatusBadge } from "@/features/admin/workflow-ui";
import { EligibilityReport } from "@/features/admin/eligibility-report";
import { getCatalogStructureOptions, getLessonRevision } from "@/lib/data/admin";

export default async function EditorRevisionPage({ params }: { params: Promise<{ revisionId: string }> }) {
  const { revisionId } = await params;
  const [revision, catalogOptions] = await Promise.all([
    getLessonRevision(revisionId),
    getCatalogStructureOptions(),
  ]);
  if (!revision) notFound();
  const lesson = revision.lesson;
  const defaults: LessonDraftDefaults = {
    id: lesson.id, slug: lesson.slug, courseId: lesson.courseId,
    moduleId: lesson.moduleId, order: lesson.order, version: lesson.version,
    titleVi: lesson.title.vi, titleKo: lesson.title.ko, summary: lesson.summary,
    objectives: lesson.objectives.join("\n"),
    vocabulary: lesson.vocabulary.map((item) => [item.korean, item.vietnamese, item.romanization, item.category, item.partOfSpeech ?? ""].join(" | ")).join("\n"),
    grammar: lesson.grammar.map((point) => ({
      title: point.title,
      form: point.form,
      explanation: point.explanation,
      formula: point.formula,
      examples: point.examples.map(({ korean, vietnamese }) => ({ korean, vietnamese })),
    })),
    changeSummary: "",
  };
  const editable = ["draft", "changes_requested"].includes(revision.status);
  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <Link href="/bien-tap/noi-dung" className="text-sm font-black text-brand-700">← Bài học của tôi</Link>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-black uppercase tracking-widest text-brand-600">Phiên bản {lesson.version}</p><h1 className="mt-2 text-4xl font-black">{lesson.title.vi}</h1></div>
        <StatusBadge status={revision.status} />
      </div>
      <Link href={`/xem-truoc/${revision.id}`} className="mt-5 inline-flex rounded-2xl border-2 border-brand-500 px-5 py-3 font-black text-brand-700">▶ Xem như người học</Link>
      {editable && (
        <div className="mt-5 flex justify-end">
          <Link href={`/bien-tap/noi-dung/${revision.id}/tu-vung`} className="rounded-2xl bg-[#10243e] px-5 py-3 font-black text-white">Quản lý bộ từ của bài →</Link>
        </div>
      )}
      {revision.reviews.length > 0 && (
        <section className="mt-7 rounded-3xl border border-amber-200 bg-amber-50 p-6">
          <h2 className="text-lg font-black text-amber-950">Phản hồi gần nhất từ admin</h2>
          <p className="mt-2 leading-7 text-amber-900">{revision.reviews[0].comment}</p>
        </section>
      )}
      <div className="mt-7"><EligibilityReport lesson={lesson} /></div>
      <section className="surface-card mt-7 bg-white p-6 sm:p-8">
        {editable ? <LessonDraftForm revisionId={revision.id} defaults={defaults} returnTo="/bien-tap/noi-dung" catalogOptions={catalogOptions} /> : (
          <div className="py-12 text-center"><h2 className="text-2xl font-black">Bài đang được khóa chỉnh sửa</h2><p className="mt-2 text-ink-600">Admin đang duyệt hoặc bài đã hoàn tất quy trình.</p></div>
        )}
      </section>
    </main>
  );
}
