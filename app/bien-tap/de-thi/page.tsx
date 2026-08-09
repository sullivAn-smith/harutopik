import Link from "next/link";
import { getEditorExams } from "@/lib/data/exams";
import { DeleteExamDraftButton } from "@/features/exams/delete-exam-draft-button";

const labels: Record<string, string> = {
  draft: "Bản nháp", pending_review: "Chờ duyệt", changes_requested: "Cần chỉnh sửa",
  approved: "Đã duyệt", published: "Đang phát hành", unpublished: "Đã tạm gỡ",
};

export default async function EditorExamsPage({ searchParams }: { searchParams: Promise<{ submitted?: string; deleted?: string; error?: string }> }) {
  const [exams, notice] = await Promise.all([getEditorExams(), searchParams]);
  return <main className="mx-auto max-w-7xl px-5 py-10">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-sm font-black uppercase tracking-widest text-[#087eba]">Luyện thi TOPIK</p><h1 className="mt-2 text-4xl font-black">Ngân hàng đề</h1><p className="mt-3 text-ink-600">Biên soạn phần Nghe và Đọc, kiểm tra học liệu rồi gửi admin duyệt.</p></div>
      <Link href="/bien-tap/de-thi/moi" className="rounded-2xl bg-[#087eba] px-5 py-3 font-black text-white">+ Tạo đề</Link>
    </div>
    {notice.submitted && <p className="mt-6 rounded-2xl bg-emerald-50 px-5 py-4 font-bold text-emerald-800">Đã gửi đề cho admin duyệt.</p>}
    {notice.deleted && <p className="mt-6 rounded-2xl bg-emerald-50 px-5 py-4 font-bold text-emerald-800">Đã xóa bản nháp và học liệu đã tải lên của đề.</p>}
    {notice.error && <p className="mt-6 rounded-2xl bg-red-50 px-5 py-4 font-bold text-red-700">{notice.error}</p>}
    <section className="mt-8 grid gap-4 md:grid-cols-2">
      {exams.map((exam) => <article key={exam.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
        <Link href={`/bien-tap/de-thi/${exam.id}`} className="block p-6">
          <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-widest text-cyan-700">{exam.level === "topik_ii" ? "TOPIK II" : "TOPIK I"} · {exam.code}</p><h2 className="mt-2 text-xl font-black">{exam.title}</h2></div><span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">{labels[exam.status] ?? exam.status}</span></div>
          <p className="mt-4 text-sm font-semibold text-slate-500">{exam.level === "topik_i" ? "30 câu Nghe · 40 câu Đọc" : `${exam.listeningQuestionCount} câu Nghe · ${exam.readingQuestionCount} câu Đọc`} · {exam.durationMinutes} phút</p>
        </Link>
        {exam.status === "draft" && <div className="flex justify-end border-t border-slate-100 px-6 py-3"><DeleteExamDraftButton examId={exam.id} title={exam.title} /></div>}
      </article>)}
      {!exams.length && <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-white p-10 text-center font-bold text-slate-500">Chưa có đề thi. Hãy tạo đề đầu tiên.</div>}
    </section>
  </main>;
}
