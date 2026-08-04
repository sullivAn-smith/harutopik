import { z } from "zod";
import { getApiActor } from "@/lib/api/auth";
import { apiError, apiSuccess } from "@/lib/api/responses";
import { createAdminClient } from "@/lib/supabase/admin";
import { mergeAttemptAnswer } from "@/lib/exams/attempt-state";

const schema = z.object({
  questionId: z.string().uuid(), option: z.number().int().min(1).max(4).nullable(),
  currentPosition: z.number().int().positive(), flagged: z.array(z.string().uuid()).max(100),
});

export async function POST(request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const actor = await getApiActor(request); if (!actor) return apiError("UNAUTHENTICATED", "Bạn cần đăng nhập.", 401);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Đáp án không hợp lệ.", 400);
  const { attemptId } = await params; const admin = createAdminClient();
  const { data: attempt } = await admin.from("exam_attempts").select("id,user_id,status,expires_at,answers,question_snapshot").eq("id", attemptId).maybeSingle();
  if (!attempt || attempt.user_id !== actor.user.id) return apiError("NOT_FOUND", "Không tìm thấy lượt thi.", 404);
  if (attempt.status !== "in_progress" || !attempt.expires_at || Date.parse(attempt.expires_at) <= Date.now()) {
    return apiError("EXAM_EXPIRED", "Thời gian làm bài đã kết thúc.", 409);
  }
  const question = (attempt.question_snapshot as Array<{ id: string; position: number; section: "listening" | "reading" }>).find((item) => item.id === parsed.data.questionId);
  if (!question) return apiError("QUESTION_NOT_FOUND", "Câu hỏi không thuộc đề này.", 400);
  const answers = mergeAttemptAnswer((attempt.answers ?? {}) as Record<string, number>, parsed.data.questionId, parsed.data.option);
  const { error } = await admin.from("exam_attempts").update({
    answers,
    flagged: parsed.data.flagged,
    current_section: question.section,
    current_position: question.position,
    updated_at: new Date().toISOString(),
  }).eq("id", attemptId).eq("status", "in_progress");
  if (error) return apiError("SAVE_FAILED", "Chưa lưu được đáp án. Hãy thử lại.", 500);
  return apiSuccess({ saved: true });
}
