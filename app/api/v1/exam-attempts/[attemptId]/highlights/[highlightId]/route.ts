import { z } from "zod";
import { getApiActor } from "@/lib/api/auth";
import { apiError, apiSuccess } from "@/lib/api/responses";

const paramsSchema = z.object({
  attemptId: z.string().uuid(),
  highlightId: z.string().uuid(),
});

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ attemptId: string; highlightId: string }> },
) {
  const actor = await getApiActor(request);
  if (!actor) return apiError("UNAUTHENTICATED", "Bạn cần đăng nhập.", 401);
  const parsed = paramsSchema.safeParse(await params);
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Highlight không hợp lệ.", 400);

  const { data, error } = await actor.supabase
    .from("exam_highlights")
    .delete()
    .eq("id", parsed.data.highlightId)
    .eq("attempt_id", parsed.data.attemptId)
    .eq("user_id", actor.user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[exam-highlight] delete failed", error);
    return apiError("HIGHLIGHT_DELETE_FAILED", "Chưa thể xóa highlight. Hãy thử lại.", 500);
  }
  if (!data) return apiError("HIGHLIGHT_NOT_FOUND", "Highlight không còn tồn tại.", 404);
  return apiSuccess({ deleted: true, id: data.id });
}
