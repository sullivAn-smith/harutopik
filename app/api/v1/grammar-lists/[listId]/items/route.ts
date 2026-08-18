import { apiError, apiSuccess } from "@/lib/api/responses";
import { getApiActor } from "@/lib/api/auth";
import { saveGrammarItemSchema } from "@/lib/grammar-lists/schema";
import { GRAMMAR_LIST_PREFIX } from "@/lib/grammar-lists/schema";

type Context = { params: Promise<{ listId: string }> };
export async function POST(request: Request, context: Context) {
  const actor = await getApiActor(request);
  if (!actor) return apiError("UNAUTHENTICATED", "Bạn cần đăng nhập.", 401);
  const { listId } = await context.params;
  const parsed = saveGrammarItemSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Dữ liệu ngữ pháp chưa hợp lệ.", 422);
  const { data: list } = await actor.supabase.from("vocabulary_lists").select("id").eq("id", listId).eq("user_id", actor.user.id).like("name", `${GRAMMAR_LIST_PREFIX}%`).maybeSingle();
  if (!list) return apiError("LIST_NOT_FOUND", "Không tìm thấy bộ ngữ pháp.", 404);
  const { data: existing } = await actor.supabase.from("vocabulary_list_items").select("vocabulary_id").eq("list_id", listId).eq("vocabulary_id", parsed.data.grammarId).eq("user_id", actor.user.id).maybeSingle();
  if (existing) return apiSuccess({ saved: true });
  const { error } = await actor.supabase.from("vocabulary_list_items").insert({ list_id: listId, user_id: actor.user.id, vocabulary_id: parsed.data.grammarId, lesson_id: parsed.data.lessonId, snapshot: { ...parsed.data.item, korean: parsed.data.item.form, vietnamese: parsed.data.item.title } });
  if (error) return apiError("ITEM_SAVE_FAILED", "Chưa thể lưu ngữ pháp.", 500);
  return apiSuccess({ saved: true }, { status: 201 });
}
