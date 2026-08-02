import { getApiActor } from "@/lib/api/auth";
import { apiError, apiSuccess } from "@/lib/api/responses";
import { createAdminClient } from "@/lib/supabase/admin";
import { scoreAttemptSnapshot } from "@/lib/exams/attempt-state";

export async function POST(_request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const actor = await getApiActor(_request); if (!actor) return apiError("UNAUTHENTICATED", "Bạn cần đăng nhập.", 401);
  const { attemptId } = await params; const admin = createAdminClient();
  const { data: attempt } = await admin.from("exam_attempts").select("id,user_id,status,current_section,reading_expires_at,answers,question_snapshot,total_questions").eq("id", attemptId).maybeSingle();
  if (!attempt || attempt.user_id !== actor.user.id) return apiError("NOT_FOUND", "Không tìm thấy lượt thi.", 404);
  if (attempt.status !== "in_progress") return apiSuccess({ submitted: true, score: attempt.status });
  const answers = (attempt.answers ?? {}) as Record<string, number>;
  if (attempt.current_section !== "reading") return apiError("INVALID_SECTION", "Bạn phải hoàn thành phần Nghe trước.", 409);
  const scores = scoreAttemptSnapshot(attempt.question_snapshot as Parameters<typeof scoreAttemptSnapshot>[0], answers);
  const expired = attempt.reading_expires_at ? Date.parse(attempt.reading_expires_at) <= Date.now() : false;
  const { error } = await admin.from("exam_attempts").update({ status: expired ? "expired" : "submitted", current_section: "completed", submitted_at: new Date().toISOString(), correct_count: scores.correctCount, score: scores.totalScore, listening_score: scores.listeningScore, reading_score: scores.readingScore, updated_at: new Date().toISOString() }).eq("id", attemptId).eq("status", "in_progress");
  if (error) return apiError("SUBMIT_FAILED", "Chưa thể nộp bài. Hãy thử lại.", 500);
  return apiSuccess({ submitted: true, score: scores.totalScore, correctCount: scores.correctCount });
}
