import { z } from "zod";
import { getApiActor } from "@/lib/api/auth";
import { apiError, apiSuccess } from "@/lib/api/responses";

const reviewSchema = z.object({ listId: z.string().uuid() });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ attemptId: string; highlightId: string }> },
) {
  const actor = await getApiActor(request);
  if (!actor) return apiError("UNAUTHENTICATED", "Bạn cần đăng nhập.", 401);
  const parsed = reviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Bộ từ chưa hợp lệ.", 422);
  const { attemptId, highlightId } = await params;
  const { data, error } = await actor.supabase.rpc("save_exam_highlight_to_review_list", {
    p_attempt_id: attemptId,
    p_highlight_id: highlightId,
    p_list_id: parsed.data.listId,
  });
  if (error) {
    console.error("[exam-highlight] review save failed", error);
    const migrationMissing = error.code === "42883" || error.code === "PGRST202";
    const message = String(error.message ?? "");
    return apiError(
      "REVIEW_SAVE_FAILED",
      migrationMissing
        ? "Chức năng lưu từ ôn tập chưa được cập nhật trên Supabase. Hãy chạy migration mới rồi thử lại."
        : message.includes("LIST_NOT_FOUND")
          ? "Bộ từ không còn tồn tại. Hãy chọn bộ khác."
          : message.includes("HIGHLIGHT_NOT_FOUND")
            ? "Không tìm thấy đoạn highlight. Hãy bôi đen và lưu lại."
            : "Chưa thể lưu từ vào bộ ôn tập. Hãy thử lại.",
      500,
    );
  }
  return apiSuccess(data);
}
