import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth/authorize";
import { getPublishedExams, getUserExamHistorySummary } from "@/lib/data/exams";
import { ExamLibraryTabs } from "@/features/exams/exam-library-tabs";
import { ExamLibraryGrid } from "@/features/exams/exam-library-grid";

async function PersonalizedExamGrid({ exams }: { exams: Awaited<ReturnType<typeof getPublishedExams>> }) {
  const user = await getCurrentUser();
  const history = user ? await getUserExamHistorySummary(user.id) : [];
  return <ExamLibraryGrid exams={exams} history={history} />;
}

export default async function PracticeTests({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [exams, notice] = await Promise.all([
    getPublishedExams(),
    searchParams,
  ]);
  const topikOneCount = exams.filter((exam) => exam.level === "topik_i").length;
  const topikTwoCount = exams.length - topikOneCount;

  return (
    <main className="elegant-blue min-h-screen text-[#10243e]">
      <div className="relative z-10 mx-auto max-w-7xl px-5 py-8 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-2 rounded-xl border border-[#10243e]/15 bg-white px-4 py-2.5 font-black text-[#10243e] shadow-sm transition hover:-translate-x-1 hover:border-[#10243e]/30">← Trang chủ</Link>
          <ExamLibraryTabs active="exams" />
        </div>
        {notice.error && <p role="alert" className="mt-5 rounded-2xl bg-red-50 p-4 font-bold text-red-700">{notice.error}</p>}

        <section className="relative mt-7 overflow-hidden rounded-[2.25rem] bg-gradient-to-br from-[#0a3158] via-[#087eba] to-[#19a9d6] px-7 py-8 text-white shadow-[0_24px_60px_rgba(8,75,128,.22)] sm:px-10 sm:py-10">
          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full border-[36px] border-white/5" />
          <div className="absolute bottom-0 right-1/4 h-32 w-32 translate-y-1/2 rounded-full bg-cyan-300/10 blur-xl" />
          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[.24em] text-cyan-200">Kho đề Harutopik</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Luyện đề TOPIK</h1>
              <p className="mt-3 max-w-2xl text-base font-semibold leading-7 text-blue-100 sm:text-lg">Tìm đề phù hợp, luyện Nghe và Đọc, rồi theo dõi điểm cao nhất sau mỗi lần làm.</p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-center backdrop-blur"><strong className="block text-2xl">{exams.length}</strong><span className="text-xs font-bold text-blue-100">Tổng đề</span></div>
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-center backdrop-blur"><strong className="block text-2xl">{topikOneCount}</strong><span className="text-xs font-bold text-blue-100">TOPIK I</span></div>
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-center backdrop-blur"><strong className="block text-2xl">{topikTwoCount}</strong><span className="text-xs font-bold text-blue-100">TOPIK II</span></div>
            </div>
          </div>
        </section>

        <Suspense fallback={<ExamLibraryGrid exams={exams} history={[]} historyPending />}>
          <PersonalizedExamGrid exams={exams} />
        </Suspense>
      </div>
    </main>
  );
}
