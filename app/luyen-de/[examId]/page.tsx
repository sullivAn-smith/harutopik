import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentActor } from "@/lib/auth/authorize";
import { ExamPreflight } from "@/features/exams/exam-preflight";

export default async function ExamInstructionsPage({ params, searchParams }: {
  params: Promise<{ examId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ examId }, notice, actor] = await Promise.all([params, searchParams, getCurrentActor()]);
  const admin = createAdminClient();
  const [{ data: exam }, activeResult] = await Promise.all([
    admin.from("exam_sets").select("id,title,description,level,version,listening_duration_minutes,reading_duration_minutes,instructions,exam_questions(count)").eq("id", examId).eq("status", "published").maybeSingle(),
    actor
      ? admin.from("exam_attempts").select("id,attempt_mode,exam_version,expires_at,current_section,current_position,answers,total_questions").eq("exam_id", examId).eq("user_id", actor.id).eq("status", "in_progress").gt("expires_at", new Date().toISOString()).order("started_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);
  if (!exam) notFound();
  const count = exam.exam_questions?.[0]?.count ?? 0;
  const activeAttempts = (activeResult.data ?? []).filter((attempt) => attempt.exam_version === exam.version).map((attempt) => ({
    id: attempt.id,
    mode: attempt.attempt_mode,
    expiresAt: attempt.expires_at,
    section: attempt.current_section,
    position: attempt.current_position,
    answeredCount: Object.keys((attempt.answers ?? {}) as Record<string, number>).length,
    totalQuestions: attempt.total_questions,
  }));
  return <main className="elegant-blue min-h-screen text-[#10243e]"><div className="mx-auto max-w-4xl px-5 py-10"><Link href="/luyen-de" className="font-black text-[#087eba]">← Danh sách đề</Link>{notice.error && <p className="mt-5 rounded-2xl bg-red-50 p-4 font-bold text-red-700">{notice.error}</p>}<section className="mt-6 overflow-hidden rounded-[2rem] bg-white shadow-2xl"><div className="bg-gradient-to-r from-[#10243e] to-[#087eba] p-8 text-center text-white"><p className="text-xs font-black uppercase tracking-[.2em] text-cyan-200">{exam.level === "topik_ii" ? "TOPIK II" : "TOPIK I"} · Trước khi bắt đầu</p><h1 className="mt-3 text-4xl font-black">{exam.title}</h1><p className="mt-3 text-blue-100">{exam.description} · {count} câu</p></div><ExamPreflight examId={exam.id} listeningMinutes={exam.listening_duration_minutes} readingMinutes={exam.reading_duration_minutes} activeAttempts={activeAttempts} /></section></div></main>;
}
