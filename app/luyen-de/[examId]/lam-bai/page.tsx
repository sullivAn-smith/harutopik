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
    return { id: String(q.id), position: Number(q.position), instruction: String(q.instruction ?? ""), prompt: String(q.prompt ?? ""), audioUrl: String(q.audio_url ?? ""), imageUrl: String(q.image_url ?? ""), playLimit: Number(q.play_limit ?? 1), options: Array.isArray(q.options) ? q.options.map(String) : [] };
  });
  return <ExamRunner attemptId={attempt.id} examId={examId} title={(attempt.exam_sets as unknown as { title: string })?.title ?? "Đề nghe TOPIK I"} expiresAt={attempt.expires_at} initialPosition={attempt.current_position} initialAnswers={(attempt.answers ?? {}) as Record<string, number>} initialFlagged={Array.isArray(attempt.flagged) ? attempt.flagged.map(String) : []} questions={snapshot} />;
}
