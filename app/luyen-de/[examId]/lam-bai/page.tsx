import { notFound, redirect } from "next/navigation";
import { getCurrentActor } from "@/lib/auth/authorize";
import { getExamAttempt } from "@/lib/data/exams";
import { ExamRunner } from "@/features/exams/exam-runner";

export default async function ExamRunnerPage({ params, searchParams }: { params: Promise<{ examId: string }>; searchParams: Promise<{ attempt?: string }> }) {
  const [{ examId }, query, actor] = await Promise.all([params, searchParams, getCurrentActor()]);
  if (!actor) redirect(`/dang-nhap?next=${encodeURIComponent(`/luyen-de/${examId}`)}`);
  if (!query.attempt) notFound();
  const attempt = await getExamAttempt(query.attempt, actor.id);
  if (!attempt || attempt.exam_id !== examId) notFound();
  if (attempt.status !== "in_progress") redirect(`/luyen-de/${examId}/ket-qua?attempt=${attempt.id}`);
  const snapshot = (Array.isArray(attempt.question_snapshot) ? attempt.question_snapshot : []).map((raw) => {
    const q = raw as Record<string, unknown>;
    return { id: String(q.id), position: Number(q.position), section: q.section === "reading" ? "reading" as const : "listening" as const, audioBlockKey: String(q.audio_block_key ?? ""), readingType: String(q.reading_type ?? "standard"), passageBlockKey: String(q.passage_block_key ?? ""), passage: String(q.passage ?? ""), answerType: q.answer_type === "image" ? "image" as const : "text" as const, instruction: String(q.instruction ?? ""), prompt: String(q.prompt ?? ""), audioUrl: String(q.audio_url ?? ""), imageUrl: String(q.image_url ?? ""), options: Array.isArray(q.options) ? q.options.map(String) : [], optionImages: Array.isArray(q.option_images) ? q.option_images.map(String) : ["", "", "", ""] };
  });
  const section = attempt.current_section === "reading" ? "reading" as const : "listening" as const;
  const expiresAt = attempt.expires_at;
  if (!expiresAt) notFound();
  const initialHighlights = Array.isArray(attempt.exam_highlights) ? attempt.exam_highlights.map((raw) => {
    const highlight = raw as Record<string, unknown>;
    return {
      id: String(highlight.id),
      questionId: String(highlight.question_id),
      sourceField: highlight.source_field === "prompt" ? "prompt" as const : highlight.source_field === "option" ? "option" as const : "instruction" as const,
      sourceIndex: typeof highlight.source_index === "number" ? highlight.source_index : null,
      selectedText: String(highlight.selected_text ?? ""),
      prefixText: String(highlight.prefix_text ?? ""),
      suffixText: String(highlight.suffix_text ?? ""),
      color: highlight.color === "blue" ? "blue" as const : highlight.color === "pink" ? "pink" as const : "yellow" as const,
      reviewListId: highlight.review_list_id ? String(highlight.review_list_id) : null,
    };
  }) : [];
  return <ExamRunner attemptId={attempt.id} examId={examId} title={(attempt.exam_sets as unknown as { title: string })?.title ?? "Đề TOPIK I"} section={section} expiresAt={expiresAt} initialPosition={attempt.current_position} initialAnswers={(attempt.answers ?? {}) as Record<string, number>} initialFlagged={Array.isArray(attempt.flagged) ? attempt.flagged.map(String) : []} initialAudioPlays={(attempt.audio_plays ?? {}) as Record<string, number>} initialWindowLeaveCount={attempt.window_leave_count ?? 0} initialHighlights={initialHighlights} questions={snapshot} />;
}
