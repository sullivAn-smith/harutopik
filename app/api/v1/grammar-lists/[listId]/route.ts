import { apiError, apiSuccess } from "@/lib/api/responses";
import { getApiActor } from "@/lib/api/auth";
import { GRAMMAR_FAVORITES_STORAGE_NAME, GRAMMAR_LIST_PREFIX } from "@/lib/grammar-lists/schema";

type Context = { params: Promise<{ listId: string }> };
export async function DELETE(request: Request, context: Context) {
  const actor = await getApiActor(request);
  if (!actor) return apiError("UNAUTHENTICATED", "Bạn cần đăng nhập.", 401);
  const { listId } = await context.params;
  const { error, count } = await actor.supabase.from("vocabulary_lists").delete({ count: "exact" }).eq("id", listId).eq("user_id", actor.user.id).like("name", `${GRAMMAR_LIST_PREFIX}%`).neq("name", GRAMMAR_FAVORITES_STORAGE_NAME);
  if (error) return apiError("LIST_DELETE_FAILED", "Chưa thể xoá bộ ngữ pháp.", 500);
  if (!count) return apiError("LIST_NOT_FOUND", "Không tìm thấy bộ ngữ pháp có thể xoá.", 404);
  return apiSuccess({ deleted: true });
}
