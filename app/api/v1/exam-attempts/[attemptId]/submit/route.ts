import { getApiActor } from "@/lib/api/auth";
import { apiError, apiSuccess } from "@/lib/api/responses";
import { createAdminClient } from "@/lib/supabase/admin";
import { scoreAttemptSnapshot } from "@/lib/exams/attempt-state";
import { recordStreakActivity } from "@/lib/streaks/record-activity";

export async function POST(_request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const actor = await getApiActor(_request); if (!actor) return apiError("UNAUTHENTICATED", "Bạn cần đăng nhập.", 401);
  const { attemptId } = await params; const admin = createAdminClient();
  const { data: attempt } = await admin.from("exam_attempts").select("id,user_id,status,expires_at,submitted_at,answers,question_snapshot,total_questions").eq("id", attemptId).maybeSingle();
  if (!attempt || attempt.user_id !== actor.user.id) return apiError("NOT_FOUND", "Không tìm thấy lượt thi.", 404);
  if (attempt.status !== "in_progress") {
    if ((attempt.status === "submitted" || attempt.status === "expired") && attempt.submitted_at) {
      await recordStreakActivity({ userId: actor.user.id, completedAt: attempt.submitted_at, sourceType: "exam", sourceId: attemptId });
    }
    return apiSuccess({ submitted: true, score: attempt.status });
  }
  const answers = (attempt.answers ?? {}) as Record<string, number>;
  const scores = scoreAttemptSnapshot(attempt.question_snapshot as Parameters<typeof scoreAttemptSnapshot>[0], answers);
  const expired = attempt.expires_at ? Date.parse(attempt.expires_at) <= Date.now() : false;
  const submittedAt = new Date().toISOString();
  const { error } = await admin.from("exam_attempts").update({ status: expired ? "expired" : "submitted", current_section: "completed", submitted_at: submittedAt, correct_count: scores.correctCount, score: scores.totalScore, listening_score: scores.listeningScore, reading_score: scores.readingScore, updated_at: submittedAt }).eq("id", attemptId).eq("status", "in_progress");
  if (error) return apiError("SUBMIT_FAILED", "Chưa thể nộp bài. Hãy thử lại.", 500);
  await recordStreakActivity({
    userId: actor.user.id,
    completedAt: submittedAt,
    sourceType: "exam",
    sourceId: attemptId,
  });
  return apiSuccess({ submitted: true, score: scores.totalScore, correctCount: scores.correctCount });
}
