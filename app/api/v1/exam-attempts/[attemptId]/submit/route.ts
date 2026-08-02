import { getApiActor } from "@/lib/api/auth";
import { apiError, apiSuccess } from "@/lib/api/responses";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(_request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const actor = await getApiActor(_request); if (!actor) return apiError("UNAUTHENTICATED", "Bạn cần đăng nhập.", 401);
  const { attemptId } = await params; const admin = createAdminClient();
  const { data: attempt } = await admin.from("exam_attempts").select("id,user_id,status,expires_at,answers,question_snapshot,total_questions").eq("id", attemptId).maybeSingle();
  if (!attempt || attempt.user_id !== actor.user.id) return apiError("NOT_FOUND", "Không tìm thấy lượt thi.", 404);
  if (attempt.status !== "in_progress") return apiSuccess({ submitted: true, score: attempt.status });
  const answers = (attempt.answers ?? {}) as Record<string, number>;
  const questions = attempt.question_snapshot as Array<{ id: string; correct_option: number }>;
  const correct = questions.reduce((count, q) => count + (answers[q.id] === q.correct_option ? 1 : 0), 0);
  const score = Math.round((correct / attempt.total_questions) * 100);
  const expired = Date.parse(attempt.expires_at) <= Date.now();
  const { error } = await admin.from("exam_attempts").update({ status: expired ? "expired" : "submitted", submitted_at: new Date().toISOString(), correct_count: correct, score, updated_at: new Date().toISOString() }).eq("id", attemptId).eq("status", "in_progress");
  if (error) return apiError("SUBMIT_FAILED", "Chưa thể nộp bài. Hãy thử lại.", 500);
  return apiSuccess({ submitted: true, score, correctCount: correct });
}
