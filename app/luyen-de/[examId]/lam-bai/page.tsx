import { notFound, redirect } from "next/navigation";
import { getCurrentActor } from "@/lib/auth/authorize";
import { getExamAttempt } from "@/lib/data/exams";
import { ExamRunner } from "@/features/exams/exam-runner";

export default async function ExamRunnerPage({ params, searchParams }: { params: Promise<{ examId: string }>; searchParams: Promise<{ attempt?: string }> }) {
  const [{ examId }, query, actor] = await Promise.all([params, searchParams, getCurrentActor()]);
  if (!actor) redirect(`/dang-nhap?next=/luyen-de/${examId}`);
  if (!query.attempt) notFound();
  const attempt = await getExamAttempt(query.attempt, actor.id);
  if (!attempt || attempt.exam_id !== examId) notFound();
  if (attempt.status !== "in_progress") redirect(`/luyen-de/${examId}/ket-qua?attempt=${attempt.id}`);
  const snapshot = (Array.isArray(attempt.question_snapshot) ? attempt.question_snapshot : []).map((raw) => {
    const q = raw as Record<string, unknown>;
    return { id: String(q.id), position: Number(q.position), section: q.section === "reading" ? "reading" as const : "listening" as const, instruction: String(q.instruction ?? ""), prompt: String(q.prompt ?? ""), audioUrl: String(q.audio_url ?? ""), imageUrl: String(q.image_url ?? ""), options: Array.isArray(q.options) ? q.options.map(String) : [] };
  });
  const section = attempt.current_section === "reading" ? "reading" as const : "listening" as const;
  const expiresAt = section === "reading" ? attempt.reading_expires_at : attempt.listening_expires_at;
  if (!expiresAt) notFound();
  return <ExamRunner attemptId={attempt.id} examId={examId} title={(attempt.exam_sets as unknown as { title: string })?.title ?? "Đề TOPIK I"} section={section} expiresAt={expiresAt} initialPosition={attempt.current_position} initialAnswers={(attempt.answers ?? {}) as Record<string, number>} initialFlagged={Array.isArray(attempt.flagged) ? attempt.flagged.map(String) : []} initialAudioPlays={(attempt.audio_plays ?? {}) as Record<string, number>} initialWindowLeaveCount={attempt.window_leave_count ?? 0} questions={snapshot} />;
}
