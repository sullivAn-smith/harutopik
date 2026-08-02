import Link from "next/link";
import { getEditorExams } from "@/lib/data/exams";

export default async function AdminExamsPage({ searchParams }: { searchParams: Promise<{ reviewed?: string; published?: string }> }) {
  const [exams, notice] = await Promise.all([getEditorExams(), searchParams]);
  const relevant = exams.filter((exam) => ["pending_review", "approved", "published", "changes_requested"].includes(exam.status));
  return <main className="mx-auto max-w-7xl px-5 py-10">
    <p className="text-xs font-black uppercase tracking-[.18em] text-violet-600">TOPIK Exam Control</p><h1 className="mt-2 text-4xl font-black">Duyệt và phát hành đề</h1><p className="mt-3 text-slate-600">Kiểm tra từng câu, nghe thử audio và quyết định trước khi người học nhìn thấy đề.</p>
    {(notice.reviewed || notice.published) && <p className="mt-6 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-800">Đã cập nhật quy trình đề thi.</p>}
    <section className="mt-8 overflow-hidden rounded-3xl border bg-white shadow-sm"><div className="divide-y">
      {relevant.map((exam) => <Link key={exam.id} href={`/quan-tri/de-thi/${exam.id}`} className="flex flex-wrap items-center justify-between gap-4 p-6 transition hover:bg-violet-50/40"><div><p className="text-xs font-black uppercase tracking-widest text-violet-600">{exam.code}</p><h2 className="mt-1 text-xl font-black">{exam.title}</h2><p className="mt-2 text-sm font-semibold text-slate-500">{exam.questionCount} câu · {exam.durationMinutes} phút</p></div><span className="rounded-full bg-violet-100 px-4 py-2 text-sm font-black text-violet-700">{exam.status}</span></Link>)}
      {!relevant.length && <p className="p-10 text-center font-bold text-slate-500">Chưa có đề nào trong quy trình duyệt.</p>}
    </div></section>
  </main>;
}
