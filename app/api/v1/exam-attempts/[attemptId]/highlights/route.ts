import { z } from "zod";
import { getApiActor } from "@/lib/api/auth";
import { apiError, apiSuccess } from "@/lib/api/responses";

const highlightSchema = z.object({
  questionId: z.string().uuid(),
  section: z.enum(["listening", "reading"]),
  sourceField: z.enum(["instruction", "prompt", "option"]),
  sourceIndex: z.number().int().min(0).max(3).nullable().default(null),
  selectedText: z.string().trim().min(1).max(120),
  prefixText: z.string().max(40).default(""),
  suffixText: z.string().max(40).default(""),
  color: z.enum(["yellow", "blue", "pink"]).default("yellow"),
});

export async function POST(request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const actor = await getApiActor(request);
  if (!actor) return apiError("UNAUTHENTICATED", "Bạn cần đăng nhập.", 401);
  const parsed = highlightSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Đoạn highlight chưa hợp lệ.", 400);
  const { attemptId } = await params;
  const { data, error } = await actor.supabase.rpc("upsert_exam_highlight", {
    p_attempt_id: attemptId,
    p_question_id: parsed.data.questionId,
    p_section: parsed.data.section,
    p_source_field: parsed.data.sourceField,
    p_source_index: parsed.data.sourceIndex,
    p_selected_text: parsed.data.selectedText,
    p_prefix_text: parsed.data.prefixText,
    p_suffix_text: parsed.data.suffixText,
    p_color: parsed.data.color,
  });
  if (error) {
    console.error("[exam-highlight] atomic save failed", error);
    const migrationMissing = error.code === "42883" || error.code === "PGRST202";
    const message = String(error.message ?? "");
    return apiError(
      "HIGHLIGHT_SAVE_FAILED",
      migrationMissing
        ? "Chức năng highlight chưa được cập nhật trên Supabase. Hãy chạy migration mới rồi thử lại."
        : message.includes("HIGHLIGHT_LIMIT")
          ? "Bạn đã lưu tối đa 50 từ hoặc cụm từ."
          : message.includes("ATTEMPT_CLOSED")
            ? "Lượt làm đề đã kết thúc nên không thể thêm highlight mới."
            : "Không thể lưu highlight. Hãy thử lại.",
      500,
    );
  }
  return apiSuccess(data);
}
