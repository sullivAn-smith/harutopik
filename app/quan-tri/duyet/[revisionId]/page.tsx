import Link from "next/link";
import { notFound } from "next/navigation";
import { reviewRevision } from "@/features/admin/content-actions";
import { EligibilityReport } from "@/features/admin/eligibility-report";
import { getLessonRevision } from "@/lib/data/admin";

export default async function ReviewDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ revisionId: string }>;
  searchParams: Promise<{ review?: string; errorMessage?: string }>;
}) {
  const { revisionId } = await params;
  const revision = await getLessonRevision(revisionId);
  if (!revision || revision.status !== "in_review") notFound();
  const { review, errorMessage } = await searchParams;
  const lesson = revision.lesson;
  return (
    <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <Link href="/quan-tri/duyet" className="text-sm font-black text-brand-700">← Hàng chờ duyệt</Link>
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-sm font-black uppercase tracking-widest text-blue-600">Bản xem trước · v{lesson.version}</p><h1 className="mt-2 text-4xl font-black">{lesson.title.vi}</h1><p lang="ko" className="mt-2 text-xl font-bold text-ink-600">{lesson.title.ko}</p></div>
        <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-black text-blue-800">Đang chờ quyết định</span>
      </div>
      {review && <p className="mt-6 rounded-2xl bg-red-50 p-4 font-bold text-red-700">{review === "validation" ? "Bài chưa đạt kiểm tra dữ liệu bắt buộc nên chưa thể phê duyệt." : review === "error" ? (errorMessage ?? "Không thể lưu quyết định duyệt.") : "Vui lòng nhập nhận xét ít nhất 3 ký tự."}</p>}
      <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_23rem]">
        <div className="space-y-6">
          <EligibilityReport lesson={lesson} />
          <section className="surface-card bg-white p-6"><h2 className="text-xl font-black">Mục tiêu và mô tả</h2><p className="mt-3 leading-7 text-ink-600">{lesson.summary}</p><ul className="mt-4 grid gap-2">{lesson.objectives.map((item) => <li key={item} className="rounded-xl bg-slate-50 px-4 py-3 font-semibold">✓ {item}</li>)}</ul></section>
          <section className="surface-card bg-white p-6"><div className="flex items-center justify-between"><h2 className="text-xl font-black">Từ vựng</h2><span className="text-sm font-bold text-ink-600">{lesson.vocabulary.length} từ</span></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{lesson.vocabulary.map((item) => <article key={item.id} className="rounded-2xl border bg-slate-50 p-4"><p lang="ko" className="text-2xl font-black">{item.korean}</p><p className="mt-1 font-bold text-orange-700">{item.vietnamese}</p><p className="mt-2 text-sm text-ink-600">{item.romanization} · {item.category}</p></article>)}</div></section>
          <section className="surface-card bg-white p-6"><div className="flex items-center justify-between"><h2 className="text-xl font-black">Ngữ pháp</h2><span className="text-sm font-bold text-ink-600">{lesson.grammar.length} điểm</span></div>{lesson.grammar.length === 0 ? <p className="mt-4 rounded-2xl bg-amber-50 p-4 font-semibold text-amber-900">Bài chưa có nội dung ngữ pháp.</p> : <div className="mt-4 space-y-4">{lesson.grammar.map((point) => <article key={point.id} className="rounded-2xl border bg-slate-50 p-5"><div className="flex flex-wrap items-center gap-3"><p lang="ko" className="text-2xl font-black text-violet-800">{point.form}</p><h3 className="font-black">{point.title}</h3></div><p className="mt-3 leading-7 text-ink-600">{point.explanation}</p><p className="mt-3 rounded-xl bg-white px-4 py-3 font-bold">{point.formula}</p><div className="mt-3 space-y-2">{point.examples.map((example) => <div key={example.id}><p lang="ko" className="font-black">{example.korean}</p><p className="text-sm text-ink-600">{example.vietnamese}</p></div>)}</div></article>)}</div>}</section>
        </div>
        <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-lg xl:sticky xl:top-6">
          <h2 className="text-xl font-black">Quyết định duyệt</h2>
          <p className="mt-2 text-sm leading-6 text-ink-600">Nhận xét sẽ được lưu vào lịch sử và gửi cho người biên tập.</p>
          <form action={reviewRevision} className="mt-5">
            <input type="hidden" name="revisionId" value={revision.id} />
            <label className="text-sm font-black">Nhận xét bắt buộc<textarea name="comment" required minLength={3} rows={7} placeholder="Nêu rõ điểm đạt yêu cầu hoặc nội dung cần sửa..." className="mt-2 w-full rounded-2xl border-2 border-slate-200 p-4 font-semibold outline-none focus:border-brand-500" /></label>
            <div className="mt-4 grid gap-3">
              <button name="decision" value="approved" className="rounded-2xl bg-emerald-600 px-5 py-3 font-black text-white">✓ Phê duyệt nội dung</button>
              <button name="decision" value="changes_requested" className="rounded-2xl border-2 border-amber-400 bg-amber-50 px-5 py-3 font-black text-amber-900">↩ Yêu cầu chỉnh sửa</button>
            </div>
          </form>
        </aside>
      </div>
    </main>
  );
}
