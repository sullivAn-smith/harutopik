import Link from "next/link";
import { getPublishedExams } from "@/lib/data/exams";

export const dynamic = "force-dynamic";

export default async function PracticeTests({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [exams, notice] = await Promise.all([getPublishedExams(), searchParams]);
  return <main className="elegant-blue min-h-screen text-[#10243e]"><div className="mx-auto max-w-6xl px-5 py-10">
    <Link href="/" className="inline-flex rounded-full border border-white/80 bg-white/70 px-4 py-2 font-black shadow-sm">← Trang chủ</Link>
    <section className="mt-7 rounded-[2rem] bg-gradient-to-br from-[#10243e] via-[#164b77] to-[#087eba] p-8 text-white shadow-2xl md:p-10"><p className="text-xs font-black uppercase tracking-[.2em] text-cyan-200">TOPIK Practice</p><h1 className="mt-3 text-4xl font-black md:text-5xl">Luyện đề TOPIK I</h1><p className="mt-4 max-w-2xl text-lg leading-8 text-blue-100">Làm phần Nghe theo thời gian thật, tự động lưu đáp án và xem kết quả ngay sau khi nộp.</p></section>
    {notice.error && <p className="mt-5 rounded-2xl bg-red-50 p-4 font-bold text-red-700">{notice.error}</p>}
    <section className="mt-8 grid gap-5 md:grid-cols-2">{exams.map((exam, index) => <Link key={exam.id} href={`/luyen-de/${exam.id}`} className="group rounded-3xl border border-white/80 bg-white/75 p-6 shadow-[0_14px_30px_rgba(16,36,62,.12)] backdrop-blur transition hover:-translate-y-1 hover:bg-white"><div className="flex items-center justify-between"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-sky-100 text-xl font-black text-[#087eba]">{index + 1}</span><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">Sẵn sàng</span></div><h2 className="mt-5 text-2xl font-black">{exam.title}</h2><p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-slate-600">{exam.description || "Đề luyện nghe TOPIK I theo từng câu."}</p><p className="mt-5 font-black text-[#087eba]">{exam.questionCount} câu · {exam.durationMinutes} phút →</p></Link>)}
      {!exams.length && <div className="rounded-3xl border-2 border-dashed border-sky-200 bg-white/70 p-10 text-center font-bold text-slate-500">Chưa có đề được phát hành. Đề mới sẽ xuất hiện tại đây sau khi admin duyệt.</div>}
    </section>
  </div></main>;
}
