import Link from "next/link";
import { getPublishedExams } from "@/lib/data/exams";
import { getUserExamHistory } from "@/lib/data/exams";
import { getCurrentActor } from "@/lib/auth/authorize";
import { examAttemptModeLabel, examAttemptModeSchema } from "@/lib/exams/attempt-mode";

export const dynamic = "force-dynamic";

export default async function PracticeTests({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const actor = await getCurrentActor();
  const [exams, notice, history] = await Promise.all([getPublishedExams(), searchParams, actor ? getUserExamHistory(actor.id) : Promise.resolve([])]);
  return <main className="elegant-blue min-h-screen text-[#10243e]"><div className="mx-auto max-w-6xl px-5 py-10">
    <Link href="/" className="inline-flex rounded-full border border-white/80 bg-white/70 px-4 py-2 font-black shadow-sm">← Trang chủ</Link>
    <section className="mt-7 rounded-[2rem] bg-gradient-to-br from-[#10243e] via-[#164b77] to-[#087eba] p-8 text-white shadow-2xl md:p-10"><p className="text-xs font-black uppercase tracking-[.2em] text-cyan-200">TOPIK Practice</p><h1 className="mt-3 text-4xl font-black md:text-5xl">Luyện đề TOPIK I</h1><p className="mt-4 max-w-2xl text-lg leading-8 text-blue-100">Chọn luyện riêng Nghe, riêng Đọc hoặc thi mô phỏng đầy đủ. Đáp án được tự động lưu và có kết quả ngay sau khi nộp.</p></section>
    {notice.error && <p className="mt-5 rounded-2xl bg-red-50 p-4 font-bold text-red-700">{notice.error}</p>}
    <section className="mt-8 grid gap-5 md:grid-cols-2">{exams.map((exam, index) => <Link key={exam.id} href={`/luyen-de/${exam.id}`} className="group rounded-3xl border border-white/80 bg-white/75 p-6 shadow-[0_14px_30px_rgba(16,36,62,.12)] backdrop-blur transition hover:-translate-y-1 hover:bg-white"><div className="flex items-center justify-between"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-sky-100 text-xl font-black text-[#087eba]">{index + 1}</span><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">Sẵn sàng</span></div><h2 className="mt-5 text-2xl font-black">{exam.title}</h2><p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-slate-600">{exam.description || "Đề luyện nghe TOPIK I theo từng câu."}</p><p className="mt-5 font-black text-[#087eba]">{exam.questionCount} câu · {exam.durationMinutes} phút →</p></Link>)}
      {!exams.length && <div className="rounded-3xl border-2 border-dashed border-sky-200 bg-white/70 p-10 text-center font-bold text-slate-500">Chưa có đề được phát hành. Đề mới sẽ xuất hiện tại đây sau khi admin duyệt.</div>}
    </section>
    {history.length > 0 && <section className="mt-10 rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl backdrop-blur"><div><p className="text-xs font-black uppercase tracking-[.2em] text-cyan-700">Lịch sử của bạn</p><h2 className="mt-2 text-2xl font-black">Các lần luyện gần đây</h2></div><div className="mt-5 divide-y">{history.map((attempt) => {
      const parsedMode = examAttemptModeSchema.safeParse(attempt.attempt_mode);
      const mode = parsedMode.success ? parsedMode.data : "full";
      return <Link key={attempt.id} href={`/luyen-de/${attempt.exam_id}/ket-qua?attempt=${attempt.id}`} className="flex flex-wrap items-center justify-between gap-3 py-4 transition hover:text-[#087eba]"><div><strong>{(attempt.exam_sets as unknown as { title?: string } | null)?.title ?? "Đề TOPIK"}</strong><p className="mt-1 text-sm font-semibold text-slate-500">{examAttemptModeLabel(mode)} · {new Date(attempt.started_at).toLocaleDateString("vi-VN")} · {attempt.correct_count ?? 0}/{attempt.total_questions} câu đúng</p></div><span className="rounded-full bg-sky-100 px-4 py-2 font-black text-[#087eba]">{attempt.score ?? 0}/{mode === "full" ? 200 : 100} →</span></Link>;
    })}</div></section>}
  </div></main>;
}
