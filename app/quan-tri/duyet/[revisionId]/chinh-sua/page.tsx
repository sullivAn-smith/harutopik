import Link from "next/link";
import { notFound } from "next/navigation";
import { EligibilityReport } from "@/features/admin/eligibility-report";
import { LessonDraftForm, type LessonDraftDefaults } from "@/features/admin/lesson-draft-form";
import { getCatalogStructureOptions, getLessonRevision } from "@/lib/data/admin";

export default async function ReviewQuickEditPage({
  params,
}: {
  params: Promise<{ revisionId: string }>;
}) {
  const { revisionId } = await params;
  const [revision, catalogOptions] = await Promise.all([
    getLessonRevision(revisionId),
    getCatalogStructureOptions(),
  ]);
  if (!revision || revision.status !== "in_review") notFound();
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
      .map((item) => [item.korean, item.vietnamese, item.romanization, item.category, item.partOfSpeech ?? ""].join(" | "))
      .join("\n"),
    grammar: lesson.grammar.map((point) => ({
      title: point.title,
      form: point.form,
      explanation: point.explanation,
      formula: point.formula,
      examples: point.examples.map(({ korean, vietnamese }) => ({ korean, vietnamese })),
    })),
    exercises: lesson.exercises
      .filter((exercise) => exercise.type === "fill-blank")
      .map((exercise) => ({
        prompt: exercise.prompt,
        translation: exercise.translation,
        acceptedAnswers: exercise.acceptedAnswers,
      })),
    changeSummary: "",
  };
  return (
    <main className="mx-auto max-w-5xl px-5 py-10 lg:px-8">
      <Link href={`/quan-tri/duyet/${revision.id}`} className="font-black text-brand-700">← Quay lại quyết định duyệt</Link>
      <div className="mt-5 rounded-3xl bg-[linear-gradient(120deg,#10243e,#244b7a)] p-7 text-white">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">Admin quick edit · phiên bản {lesson.version}</p>
        <h1 className="mt-3 text-4xl font-black">{lesson.title.vi}</h1>
        <p className="mt-3 max-w-2xl text-slate-300">Lưu tại đây không trả bài về content editor và không rời hàng chờ duyệt. Sau khi lưu, bạn có thể phê duyệt ngay.</p>
      </div>
      <div className="mt-7"><EligibilityReport lesson={lesson} /></div>
      <section className="surface-card mt-7 bg-white p-6 sm:p-8">
        <LessonDraftForm revisionId={revision.id} defaults={defaults} catalogOptions={catalogOptions} reviewEdit />
      </section>
    </main>
  );
}
