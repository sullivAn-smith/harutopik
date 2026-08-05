import Link from "next/link";
import { getCurrentActor } from "@/lib/auth/authorize";
import { getPublishedExams, getUserExamHistorySummary } from "@/lib/data/exams";
import { ExamLibraryTabs } from "@/features/exams/exam-library-tabs";

export const dynamic = "force-dynamic";

export default async function PracticeTests({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const actor = await getCurrentActor();
  const [exams, notice, history] = await Promise.all([
    getPublishedExams(),
    searchParams,
    actor ? getUserExamHistorySummary(actor.id) : Promise.resolve([]),
  ]);
  const historyByExam = new Map(history.map((item) => [item.exam_id, item]));

  return (
    <main className="elegant-blue min-h-screen text-[#10243e]">
      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><Link href="/" className="font-black text-[#087eba]">← Trang chủ</Link><h1 className="mt-3 text-4xl font-black md:text-5xl">Luyện đề TOPIK</h1><p className="mt-2 font-semibold text-slate-600">Chọn đề và bắt đầu ngay.</p></div>
          <ExamLibraryTabs active="exams" />
        </div>
        {notice.error && <p role="alert" className="mt-5 rounded-2xl bg-red-50 p-4 font-bold text-red-700">{notice.error}</p>}
        <section className="mt-8 space-y-4">
          {exams.map((exam) => {
            const best = historyByExam.get(exam.id);
            return (
              <article key={exam.id} className="rounded-3xl border border-white/80 bg-white/80 p-6 shadow-[0_12px_30px_rgba(16,36,62,.1)] backdrop-blur">
                <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-black text-[#087eba]">{exam.level === "topik_ii" ? "TOPIK II" : "TOPIK I"}</span><span className="text-sm font-bold text-slate-400">{exam.code}</span></div>
                    <h2 className="mt-3 truncate text-2xl font-black">{exam.title}</h2>
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold text-slate-600"><span>Nghe {exam.listeningQuestionCount} câu</span><span>Đọc {exam.readingQuestionCount} câu</span><span>{exam.durationMinutes} phút</span>{best && <span className="text-emerald-700">Cao nhất {best.best_score}/{best.best_max_score}</span>}</div>
                  </div>
                  <Link href={`/luyen-de/${exam.id}`} className="shrink-0 rounded-2xl bg-[#087eba] px-6 py-3 text-center font-black text-white shadow-lg transition hover:bg-[#076ca0]">Làm đề →</Link>
                </div>
              </article>
            );
          })}
          {!exams.length && <div className="rounded-3xl border-2 border-dashed border-sky-200 bg-white/70 p-10 text-center font-bold text-slate-500">Chưa có đề được phát hành.</div>}
        </section>
      </div>
    </main>
  );
}
