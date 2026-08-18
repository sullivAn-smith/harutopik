import { apiError, apiSuccess } from "@/lib/api/responses";
import { getApiActor } from "@/lib/api/auth";
import { saveVocabularyItemSchema } from "@/lib/vocabulary-lists/schema";

type RouteContext = { params: Promise<{ listId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const actor = await getApiActor(request);
  if (!actor) {
    return apiError("UNAUTHENTICATED", "Bạn cần đăng nhập.", 401);
  }
  const { listId } = await context.params;
  const parsed = saveVocabularyItemSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Dữ liệu từ vựng chưa hợp lệ.",
      422,
      parsed.error.flatten().fieldErrors,
    );
  }

  const { data: list } = await actor.supabase
    .from("vocabulary_lists")
    .select("id")
    .eq("id", listId)
    .eq("user_id", actor.user.id)
    .maybeSingle();
  if (!list) {
    return apiError("LIST_NOT_FOUND", "Không tìm thấy bộ từ.", 404);
  }

  const { data: existing } = await actor.supabase
    .from("vocabulary_list_items")
    .select("vocabulary_id")
    .eq("list_id", listId)
    .eq("vocabulary_id", parsed.data.vocabularyId)
    .maybeSingle();
  if (existing) {
    return apiError(
      "VOCABULARY_ALREADY_IN_LIST",
      "Từ đã tồn tại trong bộ này",
      409,
    );
  }

  const { error } = await actor.supabase
    .from("vocabulary_list_items")
    .insert({
      list_id: listId,
      user_id: actor.user.id,
      vocabulary_id: parsed.data.vocabularyId,
      lesson_id: parsed.data.lessonId,
      snapshot: parsed.data.item,
    });
  if (error) {
    if (error.code === "23505") {
      return apiError(
        "VOCABULARY_ALREADY_IN_LIST",
        "Từ đã tồn tại trong bộ này",
        409,
      );
    }
    return apiError("ITEM_SAVE_FAILED", "Chưa thể lưu từ.", 500);
  }
  return apiSuccess({ saved: true }, { status: 201 });
}
