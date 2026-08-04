import { apiError, apiSuccess } from "@/lib/api/responses";
import { getApiActor } from "@/lib/api/auth";
import { updatePersonalVocabularyItemSchema } from "@/lib/vocabulary-lists/schema";

type RouteContext = {
  params: Promise<{ listId: string; vocabularyId: string }>;
};

export async function DELETE(request: Request, context: RouteContext) {
  const actor = await getApiActor(request);
  if (!actor) {
    return apiError("UNAUTHENTICATED", "Bạn cần đăng nhập.", 401);
  }
  const { listId, vocabularyId } = await context.params;

  if (vocabularyId.startsWith("exam-highlight-")) {
    const highlightId = vocabularyId.slice("exam-highlight-".length);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(highlightId)) {
      return apiError("INVALID_HIGHLIGHT_ID", "Mã từ highlight không hợp lệ.", 422);
    }

    const { error } = await actor.supabase.rpc(
      "remove_exam_highlight_from_review_list",
      {
        p_highlight_id: highlightId,
        p_list_id: listId,
      },
    );
    if (error) {
      return apiError(
        "ITEM_DELETE_FAILED",
        "Chưa thể bỏ từ highlight khỏi bộ. Hãy thử lại.",
        500,
      );
    }
    return apiSuccess({ deleted: true });
  }

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

export async function PATCH(request: Request, context: RouteContext) {
  const actor = await getApiActor(request);
  if (!actor) {
    return apiError("UNAUTHENTICATED", "Bạn cần đăng nhập.", 401);
  }

  const { listId, vocabularyId } = await context.params;
  const parsed = updatePersonalVocabularyItemSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Hãy kiểm tra lại từ, nghĩa, phiên âm và chủ đề.",
      422,
      parsed.error.flatten().fieldErrors,
    );
  }

  const { data: savedItem, error: readError } = await actor.supabase
    .from("vocabulary_list_items")
    .select("vocabulary_id,lesson_id")
    .eq("list_id", listId)
    .eq("vocabulary_id", vocabularyId)
    .eq("user_id", actor.user.id)
    .maybeSingle();

  if (readError) {
    return apiError("ITEM_READ_FAILED", "Chưa thể tải từ cần sửa.", 500);
  }
  if (!savedItem) {
    return apiError("ITEM_NOT_FOUND", "Không tìm thấy từ trong bộ này.", 404);
  }
  if (
    !savedItem.vocabulary_id.startsWith("exam-highlight-") &&
    !savedItem.lesson_id.startsWith("exam:")
  ) {
    return apiError(
      "ITEM_EDIT_FORBIDDEN",
      "Chỉ từ cá nhân được tạo từ highlight mới có thể sửa tại đây.",
      403,
    );
  }

  const snapshot = {
    ...parsed.data.item,
    id: vocabularyId,
  };
  const { error: updateError } = await actor.supabase
    .from("vocabulary_list_items")
    .update({ snapshot })
    .eq("list_id", listId)
    .eq("vocabulary_id", vocabularyId)
    .eq("user_id", actor.user.id);

  if (updateError) {
    return apiError("ITEM_UPDATE_FAILED", "Chưa thể lưu thay đổi của từ.", 500);
  }
  return apiSuccess({ updated: true, item: snapshot });
}
