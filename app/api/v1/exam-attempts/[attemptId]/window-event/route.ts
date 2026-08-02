import { z } from "zod";
import { getApiActor } from "@/lib/api/auth";
import { apiError, apiSuccess } from "@/lib/api/responses";

const schema = z.object({
  section: z.enum(["listening", "reading"]),
  eventType: z.enum(["hidden", "blur", "fullscreen_exit"]),
});

export async function POST(request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const actor = await getApiActor(request);
  if (!actor) return apiError("UNAUTHENTICATED", "Bạn cần đăng nhập.", 401);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Sự kiện không hợp lệ.", 400);
  const { attemptId } = await params;
  const { data, error } = await actor.supabase.rpc("record_exam_window_event", {
    p_attempt_id: attemptId,
    p_section: parsed.data.section,
    p_event_type: parsed.data.eventType,
  });
  if (error) return apiError("EVENT_SAVE_FAILED", "Chưa ghi được cảnh báo rời cửa sổ.", 409);
  return apiSuccess({ count: data });
}
