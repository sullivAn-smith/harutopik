import { z } from "zod";
import { getApiActor } from "@/lib/api/auth";
import { apiError, apiSuccess } from "@/lib/api/responses";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  questionId: z.string().uuid(),
  section: z.enum(["listening", "reading"]),
  position: z.number().int().positive(),
});

export async function POST(request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const actor = await getApiActor(request);
  if (!actor) return apiError("UNAUTHENTICATED", "Bạn cần đăng nhập.", 401);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Vị trí câu hỏi không hợp lệ.", 400);
  const { attemptId } = await params;
  const admin = createAdminClient();
  const { data: attempt } = await admin.from("exam_attempts")
    .select("id,user_id,status,expires_at,question_snapshot")
    .eq("id", attemptId).maybeSingle();
  if (!attempt || attempt.user_id !== actor.user.id) return apiError("NOT_FOUND", "Không tìm thấy lượt thi.", 404);
  if (attempt.status !== "in_progress" || !attempt.expires_at || Date.parse(attempt.expires_at) <= Date.now()) {
    return apiError("EXAM_EXPIRED", "Thời gian làm bài đã kết thúc.", 409);
  }
  const questionExists = (attempt.question_snapshot as Array<{ id?: string; section?: string; position?: number }>).some(
    (question) => question.id === parsed.data.questionId && question.section === parsed.data.section && question.position === parsed.data.position,
  );
  if (!questionExists) return apiError("QUESTION_NOT_FOUND", "Câu hỏi không thuộc lượt thi này.", 400);
  const { error } = await admin.from("exam_attempts").update({
    current_section: parsed.data.section,
    current_position: parsed.data.position,
    updated_at: new Date().toISOString(),
  }).eq("id", attemptId).eq("status", "in_progress");
  if (error) return apiError("SAVE_FAILED", "Chưa lưu được vị trí hiện tại.", 500);
  return apiSuccess({ saved: true });
}
