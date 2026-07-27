import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  LessonDraftForm,
  type LessonDraftDefaults,
} from "@/features/admin/lesson-draft-form";
import { EligibilityReport } from "@/features/admin/eligibility-report";
import { getCatalogStructureOptions, getLessonRevision } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Chỉnh sửa bài học" };

export default async function LessonRevisionPage({
  params,
}: {
  params: Promise<{ revisionId: string }>;
}) {
  const { revisionId } = await params;
  const [revision, catalogOptions] = await Promise.all([
    getLessonRevision(revisionId),
    getCatalogStructureOptions(),
  ]);
  if (!revision) notFound();

  const lesson = revision.lesson;
  const defaults: LessonDraftDefaults = {
    id: lesson.id,
    slug: lesson.slug,
    courseId: lesson.courseId,
    moduleId: lesson.moduleId,
    order: lesson.order,
    version: lesson.version,
    titleVi: lesson.title.vi,
    titleKo: lesson.title.ko,
    summary: lesson.summary,
    objectives: lesson.objectives.join("\n"),
    vocabulary: lesson.vocabulary
      .map((item) =>
        [
          item.korean,
          item.vietnamese,
          item.romanization,
          item.category,
          item.partOfSpeech ?? "",
        ].join(" | "),
      )
      .join("\n"),
    grammar: lesson.grammar.map((point) => ({
      title: point.title,
      form: point.form,
      explanation: point.explanation,
      formula: point.formula,
      examples: point.examples.map(({ korean, vietnamese }) => ({ korean, vietnamese })),
    })),
    changeSummary: "",
  };

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <Link href="/quan-tri/noi-dung" className="text-sm font-black text-brand-700 hover:underline">
        ← Quay lại nội dung
      </Link>
      <div className="mt-5">
        <p className="text-sm font-black uppercase tracking-widest text-brand-600">
          CMS Harutopik · {revision.status}
        </p>
        <h1 className="mt-2 text-4xl font-black">{lesson.title.vi}</h1>
        <p className="mt-3 text-ink-600">
          Chỉ bản nháp mới được chỉnh sửa. Sau khi gửi duyệt, nội dung được khóa để bảo toàn phiên bản.
        </p>
      </div>
      <div className="mt-8"><EligibilityReport lesson={lesson} /></div>
      <section className="surface-card mt-8 bg-white p-6 sm:p-8">
        {["draft", "changes_requested"].includes(revision.status) ? (
          <LessonDraftForm revisionId={revision.id} defaults={defaults} returnTo="/quan-tri/noi-dung" catalogOptions={catalogOptions} />
        ) : (
          <div className="rounded-2xl bg-slate-50 p-6">
            <p className="font-black">Phiên bản này đã bị khóa chỉnh sửa.</p>
            <p className="mt-2 text-ink-600">
              Quay lại danh sách để tiếp tục bước duyệt hoặc xuất bản.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
