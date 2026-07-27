import { apiError, apiSuccess } from "@/lib/api/responses";
import { getApiActor } from "@/lib/api/auth";
import { updateVocabularyListSchema } from "@/lib/vocabulary-lists/schema";

type RouteContext = { params: Promise<{ listId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const actor = await getApiActor(request);
  if (!actor) {
    return apiError("UNAUTHENTICATED", "Bạn cần đăng nhập.", 401);
  }
  const { listId } = await context.params;
  const parsed = updateVocabularyListSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Tên bộ từ chưa hợp lệ.",
      422,
      parsed.error.flatten().fieldErrors,
    );
  }

  const { data, error } = await actor.supabase
    .from("vocabulary_lists")
    .update({ name: parsed.data.name, updated_at: new Date().toISOString() })
    .eq("id", listId)
    .eq("user_id", actor.user.id)
    .eq("kind", "custom")
    .select("id,name,kind")
    .maybeSingle();

  if (error || !data) {
    return apiError(
      "LIST_UPDATE_FAILED",
      "Không thể đổi tên danh sách này.",
      error ? 500 : 404,
    );
  }
  return apiSuccess(data);
}

export async function DELETE(request: Request, context: RouteContext) {
  const actor = await getApiActor(request);
  if (!actor) {
    return apiError("UNAUTHENTICATED", "Bạn cần đăng nhập.", 401);
  }
  const { listId } = await context.params;
  const { error, count } = await actor.supabase
    .from("vocabulary_lists")
    .delete({ count: "exact" })
    .eq("id", listId)
    .eq("user_id", actor.user.id)
    .eq("kind", "custom");

  if (error) {
    return apiError("LIST_DELETE_FAILED", "Chưa thể xoá bộ từ.", 500);
  }
  if (!count) {
    return apiError("LIST_NOT_FOUND", "Không tìm thấy bộ từ có thể xoá.", 404);
  }
  return apiSuccess({ deleted: true });
}
