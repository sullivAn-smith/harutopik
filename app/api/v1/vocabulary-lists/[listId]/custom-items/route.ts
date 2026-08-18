import { apiError, apiSuccess } from "@/lib/api/responses";
import { getApiActor } from "@/lib/api/auth";
import {
  buildCustomVocabularySnapshot,
  createCustomVocabularyItemSchema,
  customVocabularyIdPrefix,
  customVocabularyLessonId,
  customVocabularyLimit,
} from "@/lib/vocabulary-lists/schema";

type RouteContext = { params: Promise<{ listId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const actor = await getApiActor(request);
  if (!actor) {
    return apiError("UNAUTHENTICATED", "Bạn cần đăng nhập.", 401);
  }

  const parsed = createCustomVocabularyItemSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Tiếng Hàn và nghĩa tiếng Việt là hai trường bắt buộc.",
      422,
      parsed.error.flatten().fieldErrors,
    );
  }

  const { listId } = await context.params;
  const { data: list, error: listError } = await actor.supabase
    .from("vocabulary_lists")
    .select("id")
    .eq("id", listId)
    .eq("user_id", actor.user.id)
    .maybeSingle();
  if (listError) {
    return apiError("LIST_READ_FAILED", "Chưa thể kiểm tra bộ từ.", 500);
  }
  if (!list) {
    return apiError("LIST_NOT_FOUND", "Không tìm thấy bộ từ.", 404);
  }

  const { count, error: countError } = await actor.supabase
    .from("vocabulary_list_items")
    .select("vocabulary_id", { count: "exact", head: true })
    .eq("user_id", actor.user.id)
    .eq("lesson_id", customVocabularyLessonId)
    .like("vocabulary_id", `${customVocabularyIdPrefix}%`);
  if (countError) {
    return apiError(
      "CUSTOM_VOCABULARY_COUNT_FAILED",
      "Chưa thể kiểm tra giới hạn từ cá nhân.",
      500,
    );
  }
  if ((count ?? 0) >= customVocabularyLimit) {
    return apiError(
      "CUSTOM_VOCABULARY_LIMIT",
      `Mỗi tài khoản chỉ được tạo tối đa ${customVocabularyLimit} từ custom.`,
      409,
    );
  }

  const vocabularyId = `${customVocabularyIdPrefix}${crypto.randomUUID()}`;
  const item = buildCustomVocabularySnapshot(vocabularyId, parsed.data);
  const { error } = await actor.supabase.from("vocabulary_list_items").insert({
    list_id: listId,
    user_id: actor.user.id,
    vocabulary_id: vocabularyId,
    lesson_id: customVocabularyLessonId,
    snapshot: item,
  });
  if (error) {
    if (error.message.includes("CUSTOM_VOCABULARY_LIMIT")) {
      return apiError(
        "CUSTOM_VOCABULARY_LIMIT",
        `Mỗi tài khoản chỉ được tạo tối đa ${customVocabularyLimit} từ custom.`,
        409,
      );
    }
    return apiError(
      "CUSTOM_VOCABULARY_CREATE_FAILED",
      "Chưa thể thêm từ custom.",
      500,
    );
  }

  return apiSuccess(
    {
      vocabularyId,
      lessonId: customVocabularyLessonId,
      item,
      createdAt: new Date().toISOString(),
    },
    { status: 201 },
  );
}
