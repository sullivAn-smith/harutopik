import { apiError, apiSuccess } from "@/lib/api/responses";
import { getApiActor } from "@/lib/api/auth";
import { createGrammarListSchema, GRAMMAR_FAVORITES_STORAGE_NAME, GRAMMAR_LIST_PREFIX, grammarListDisplayName, grammarListStorageName } from "@/lib/grammar-lists/schema";

export async function GET(request: Request) {
  const actor = await getApiActor(request);
  if (!actor) return apiError("UNAUTHENTICATED", "Bạn cần đăng nhập.", 401);
  const includeItems = new URL(request.url).searchParams.get("includeItems") === "true";
  const { data: storedLists, error } = await actor.supabase.from("vocabulary_lists").select("id,name,created_at").eq("user_id", actor.user.id).like("name", `${GRAMMAR_LIST_PREFIX}%`).order("created_at");
  if (error) return apiError("LISTS_READ_FAILED", "Chưa thể tải bộ ngữ pháp.", 500);
  let lists = storedLists;
  if (!(lists ?? []).some((list) => list.name === GRAMMAR_FAVORITES_STORAGE_NAME)) {
    const { data: favorite, error: favoriteError } = await actor.supabase.from("vocabulary_lists").insert({ user_id: actor.user.id, name: GRAMMAR_FAVORITES_STORAGE_NAME, kind: "custom" }).select("id,name,created_at").single();
    if (favoriteError) return apiError("LISTS_READ_FAILED", "Chưa thể khởi tạo bộ ngữ pháp yêu thích.", 500);
    lists = [favorite, ...(lists ?? [])];
  }
  const listIds = (lists ?? []).map((list) => list.id);
  const { data: items, error: itemsError } = listIds.length
    ? await actor.supabase.from("vocabulary_list_items").select("list_id,vocabulary_id,lesson_id,snapshot,created_at").eq("user_id", actor.user.id).in("list_id", listIds).order("created_at", { ascending: false })
    : { data: [], error: null };
  if (itemsError) return apiError("LISTS_READ_FAILED", "Chưa thể tải ngữ pháp đã lưu.", 500);
  return apiSuccess((lists ?? []).map((list) => {
    const listItems = (items ?? []).filter((item) => item.list_id === list.id);
    return { id: list.id, name: grammarListDisplayName(list.name), kind: list.name === GRAMMAR_FAVORITES_STORAGE_NAME ? "favorites" : "custom", itemCount: listItems.length,
      ...(includeItems ? { items: listItems.map((item) => ({ grammarId: item.vocabulary_id, lessonId: item.lesson_id, item: item.snapshot, createdAt: item.created_at })) } : {}) };
  }));
}

export async function POST(request: Request) {
  const actor = await getApiActor(request);
  if (!actor) return apiError("UNAUTHENTICATED", "Bạn cần đăng nhập.", 401);
  const parsed = createGrammarListSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Tên bộ ngữ pháp chưa hợp lệ.", 422);
  const { data, error } = await actor.supabase.from("vocabulary_lists").insert({ user_id: actor.user.id, name: grammarListStorageName(parsed.data.name), kind: "custom" }).select("id,name").single();
  if (error) return apiError("LIST_CREATE_FAILED", "Chưa thể tạo bộ ngữ pháp.", 500);
  return apiSuccess({ id: data.id, name: grammarListDisplayName(data.name), kind: "custom", itemCount: 0, items: [] }, { status: 201 });
}
