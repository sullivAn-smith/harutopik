import { apiError, apiSuccess } from "@/lib/api/responses";
import { getApiActor } from "@/lib/api/auth";
import { createVocabularyListSchema } from "@/lib/vocabulary-lists/schema";

export async function GET(request: Request) {
  const actor = await getApiActor(request);
  if (!actor) {
    return apiError("UNAUTHENTICATED", "Bạn cần đăng nhập.", 401);
  }

  const includeItems =
    new URL(request.url).searchParams.get("includeItems") === "true";
  const { data: lists, error } = await actor.supabase
    .from("vocabulary_lists")
    .select("id,name,kind,created_at,updated_at")
    .eq("user_id", actor.user.id)
    .order("kind")
    .order("created_at");

  if (error) {
    return apiError("LISTS_READ_FAILED", "Chưa thể tải bộ từ.", 500);
  }

  const { data: items } = await actor.supabase
    .from("vocabulary_list_items")
    .select("list_id,vocabulary_id,lesson_id,snapshot,created_at")
    .eq("user_id", actor.user.id)
    .order("created_at", { ascending: false });

  const response = (lists ?? []).map((list) => {
    const listItems = (items ?? []).filter((item) => item.list_id === list.id);
    return {
      id: list.id,
      name: list.name,
      kind: list.kind,
      itemCount: listItems.length,
      ...(includeItems
        ? {
            items: listItems.map((item) => ({
              vocabularyId: item.vocabulary_id,
              lessonId: item.lesson_id,
              item: item.snapshot,
              createdAt: item.created_at,
            })),
          }
        : {}),
    };
  });

  return apiSuccess(response);
}

export async function POST(request: Request) {
  const actor = await getApiActor(request);
  if (!actor) {
    return apiError("UNAUTHENTICATED", "Bạn cần đăng nhập.", 401);
  }

  const parsed = createVocabularyListSchema.safeParse(
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
    .insert({
      user_id: actor.user.id,
      name: parsed.data.name,
      kind: "custom",
    })
    .select("id,name,kind")
    .single();

  if (error) {
    return apiError("LIST_CREATE_FAILED", "Chưa thể tạo bộ từ.", 500);
  }
  return apiSuccess({ ...data, itemCount: 0 }, { status: 201 });
}
