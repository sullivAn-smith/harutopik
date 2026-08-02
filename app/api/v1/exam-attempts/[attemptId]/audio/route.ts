import { z } from "zod";
import { getApiActor } from "@/lib/api/auth";
import { apiError, apiSuccess } from "@/lib/api/responses";

const schema = z.object({ questionId: z.string().uuid() });

export async function POST(request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const actor = await getApiActor(request);
  if (!actor) return apiError("UNAUTHENTICATED", "Bạn cần đăng nhập.", 401);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Câu nghe không hợp lệ.", 400);
  const { attemptId } = await params;
  const { data, error } = await actor.supabase.rpc("consume_exam_audio_play", {
    p_attempt_id: attemptId,
    p_question_id: parsed.data.questionId,
  });
  if (error) {
    if (error.message.includes("PLAY_LIMIT_REACHED")) return apiError("PLAY_LIMIT_REACHED", "Audio chỉ được nghe một lần.", 409);
    if (error.message.includes("QUESTION_LOCKED")) return apiError("QUESTION_LOCKED", "Câu nghe này đã bị khóa.", 409);
    return apiError("AUDIO_START_FAILED", "Chưa thể bắt đầu audio.", 409);
  }
  return apiSuccess({ playCount: data });
}
