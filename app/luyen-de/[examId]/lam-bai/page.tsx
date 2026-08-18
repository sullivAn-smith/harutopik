import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/authorize";
import {
  getExamAttemptForRunner,
  getExamAttemptHighlights,
} from "@/lib/data/exams";
import { ExamRunner } from "@/features/exams/exam-runner";
import { withErrorMessage } from "@/lib/navigation/redirect-url";

export default async function ExamRunnerPage({ params, searchParams }: { params: Promise<{ examId: string }>; searchParams: Promise<{ attempt?: string }> }) {
  const [{ examId }, query, user] = await Promise.all([params, searchParams, getCurrentUser()]);
  if (!user) redirect(`/dang-nhap?next=${encodeURIComponent(`/luyen-de/${examId}`)}`);
  if (!query.attempt) notFound();
  const [attempt, savedHighlights] = await Promise.all([
    getExamAttemptForRunner(query.attempt, user.id),
    getExamAttemptHighlights(query.attempt, user.id),
  ]);
  if (!attempt || attempt.exam_id !== examId) notFound();
  if (attempt.status !== "in_progress") redirect(`/luyen-de/${examId}/ket-qua?attempt=${attempt.id}`);
  const attemptExam = attempt.exam_sets as unknown as { title: string; level?: "topik_i" | "topik_ii"; version?: number } | null;
  if (attemptExam?.version && attempt.exam_version !== attemptExam.version) {
    redirect(withErrorMessage(`/luyen-de/${examId}`, "Đề vừa được cập nhật. Hãy bắt đầu lại để dùng đúng nội dung, ảnh và audio mới."));
  }
  const snapshot = (Array.isArray(attempt.question_snapshot) ? attempt.question_snapshot : []).map((raw) => {
    const q = raw as Record<string, unknown>;
    const usesUnderlineStorage = attemptExam?.level === "topik_ii" && q.section === "reading" && [3, 4, 42, 48].includes(Number(q.position));
    return { id: String(q.id), position: Number(q.position), section: q.section === "reading" ? "reading" as const : "listening" as const, audioBlockKey: String(q.audio_block_key ?? ""), readingType: String(q.reading_type ?? "standard"), passageBlockKey: String(q.passage_block_key ?? ""), passage: String(q.passage ?? ""), answerType: q.answer_type === "image" ? "image" as const : "text" as const, instruction: String(q.instruction ?? ""), prompt: String(q.prompt ?? ""), underlinedText: usesUnderlineStorage ? String(q.audio_text ?? "") : "", secondaryPrompt: q.section === "reading" && !usesUnderlineStorage ? String(q.audio_text ?? "") : "", audioUrl: String(q.audio_url ?? ""), imageUrl: String(q.image_url ?? ""), options: Array.isArray(q.options) ? q.options.map(String) : [], optionImages: Array.isArray(q.option_images) ? q.option_images.map(String) : ["", "", "", ""] };
  });
  const section = attempt.current_section === "reading" ? "reading" as const : "listening" as const;
  const expiresAt = attempt.expires_at;
  if (!expiresAt) notFound();
  const initialHighlights = savedHighlights.map((raw) => {
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
  });
  return <ExamRunner attemptId={attempt.id} examId={examId} title={attemptExam?.title ?? "Đề TOPIK I"} level={attemptExam?.level} section={section} expiresAt={expiresAt} initialPosition={attempt.current_position} initialAnswers={(attempt.answers ?? {}) as Record<string, number>} initialFlagged={Array.isArray(attempt.flagged) ? attempt.flagged.map(String) : []} initialAudioPlays={(attempt.audio_plays ?? {}) as Record<string, number>} initialWindowLeaveCount={attempt.window_leave_count ?? 0} initialHighlights={initialHighlights} questions={snapshot} />;
}
