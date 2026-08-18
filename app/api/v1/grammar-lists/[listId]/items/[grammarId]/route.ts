import { apiError, apiSuccess } from "@/lib/api/responses";
import { getApiActor } from "@/lib/api/auth";
import { GRAMMAR_LIST_PREFIX } from "@/lib/grammar-lists/schema";

type Context = { params: Promise<{ listId: string; grammarId: string }> };
export async function DELETE(request: Request, context: Context) {
  const actor = await getApiActor(request);
  if (!actor) return apiError("UNAUTHENTICATED", "Bạn cần đăng nhập.", 401);
  const { listId, grammarId } = await context.params;
  const { data: list } = await actor.supabase.from("vocabulary_lists").select("id").eq("id", listId).eq("user_id", actor.user.id).like("name", `${GRAMMAR_LIST_PREFIX}%`).maybeSingle();
  if (!list) return apiError("LIST_NOT_FOUND", "Không tìm thấy bộ ngữ pháp.", 404);
  const { error } = await actor.supabase.from("vocabulary_list_items").delete().eq("list_id", listId).eq("vocabulary_id", grammarId).eq("user_id", actor.user.id);
  if (error) return apiError("ITEM_DELETE_FAILED", "Chưa thể bỏ ngữ pháp khỏi bộ.", 500);
  return apiSuccess({ deleted: true });
}
