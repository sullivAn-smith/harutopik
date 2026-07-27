import { apiError, apiSuccess } from "@/lib/api/responses";
import { getApiActor } from "@/lib/api/auth";

type RouteContext = {
  params: Promise<{ listId: string; vocabularyId: string }>;
};

export async function DELETE(request: Request, context: RouteContext) {
  const actor = await getApiActor(request);
  if (!actor) {
    return apiError("UNAUTHENTICATED", "Bạn cần đăng nhập.", 401);
  }
  const { listId, vocabularyId } = await context.params;
  const { error } = await actor.supabase
    .from("vocabulary_list_items")
    .delete()
    .eq("list_id", listId)
    .eq("vocabulary_id", vocabularyId)
    .eq("user_id", actor.user.id);

  if (error) {
    return apiError("ITEM_DELETE_FAILED", "Chưa thể bỏ từ khỏi bộ.", 500);
  }
  return apiSuccess({ deleted: true });
}
