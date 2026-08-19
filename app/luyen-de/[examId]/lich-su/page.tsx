import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/authorize";
import { getUserExamAttemptsForExam } from "@/lib/data/exams";
import { examAttemptModeLabel, examAttemptModeSchema } from "@/lib/exams/attempt-mode";

export const dynamic = "force-dynamic";

export default async function ExamAttemptHistoryPage({ params }: { params: Promise<{ examId: string }> }) {
  const [{ examId }, user] = await Promise.all([params, getCurrentUser()]);
  if (!user) redirect(`/dang-nhap?next=/luyen-de/${examId}/lich-su`);
  const attempts = await getUserExamAttemptsForExam(user.id, examId);
  if (!attempts.length) notFound();
  const exam = attempts[0].exam_sets as unknown as { code?: string; title?: string; level?: string } | null;
  return (
    <main className="elegant-blue min-h-screen text-[#10243e]"><div className="mx-auto max-w-5xl px-5 py-10">
      <Link href="/luyen-de/lich-su" className="inline-flex items-center rounded-xl border border-[#10243e]/15 bg-white px-4 py-2.5 font-black text-[#10243e] shadow-sm transition hover:-translate-x-1 hover:border-[#10243e]/30">← Lịch sử luyện đề</Link>
      <section className="mt-6 rounded-3xl bg-gradient-to-r from-[#10243e] to-[#087eba] p-8 text-white shadow-xl"><p className="text-xs font-black uppercase tracking-[.18em] text-cyan-200">{exam?.level === "topik_ii" ? "TOPIK II" : "TOPIK I"} · {exam?.code}</p><h1 className="mt-2 text-3xl font-black">{exam?.title ?? "Đề TOPIK"}</h1><p className="mt-3 font-semibold text-blue-100">{attempts.length} lần đã hoàn thành</p></section>
      <section className="mt-7 space-y-4">{attempts.map((attempt, index) => { const modeResult = examAttemptModeSchema.safeParse(attempt.attempt_mode); const mode = modeResult.success ? modeResult.data : "full"; const maximumScore = mode === "full" ? 200 : 100; const finishedAt = attempt.submitted_at ?? attempt.started_at; const elapsedMinutes = Math.max(0, Math.round((new Date(finishedAt).getTime() - new Date(attempt.started_at).getTime()) / 60000)); return <article key={attempt.id} className="rounded-3xl border border-white/80 bg-white/80 p-6 shadow-lg"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-black text-[#087eba]">Lần {attempts.length - index}</span><strong>{examAttemptModeLabel(mode)}</strong></div><p className="mt-3 text-sm font-semibold text-slate-500">{new Date(finishedAt).toLocaleString("vi-VN")} · {elapsedMinutes} phút · {attempt.correct_count ?? 0}/{attempt.total_questions} câu đúng</p></div><div className="flex items-center gap-3"><strong className="text-xl text-[#087eba]">{attempt.score ?? 0}/{maximumScore}</strong><Link href={`/luyen-de/${examId}/ket-qua?attempt=${attempt.id}`} className="rounded-xl bg-[#087eba] px-4 py-2 font-black text-white">Xem kết quả</Link></div></div></article>; })}</section>
    </div></main>
  );
}
