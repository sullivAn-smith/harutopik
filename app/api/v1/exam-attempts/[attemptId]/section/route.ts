import { z } from "zod";
import { getApiActor } from "@/lib/api/auth";
import { apiError, apiSuccess } from "@/lib/api/responses";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({ section: z.literal("reading") });

export async function POST(request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const actor = await getApiActor(request);
  if (!actor) return apiError("UNAUTHENTICATED", "Bạn cần đăng nhập.", 401);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Phần thi không hợp lệ.", 400);
  const { attemptId } = await params;
  const admin = createAdminClient();
  const { data: attempt } = await admin.from("exam_attempts")
    .select("id,user_id,status,current_section,exam_sets(reading_duration_minutes)")
    .eq("id", attemptId).maybeSingle();
  if (!attempt || attempt.user_id !== actor.user.id) return apiError("NOT_FOUND", "Không tìm thấy lượt thi.", 404);
  if (attempt.status !== "in_progress" || attempt.current_section !== "listening") return apiError("INVALID_SECTION", "Không thể chuyển phần.", 409);
  const exam = attempt.exam_sets as unknown as { reading_duration_minutes: number };
  const { error } = await admin.from("exam_attempts").update({
    current_section: "reading",
    current_position: 1,
    reading_expires_at: new Date(Date.now() + exam.reading_duration_minutes * 60_000).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", attemptId).eq("current_section", "listening");
  if (error) return apiError("SECTION_START_FAILED", "Chưa thể bắt đầu phần Đọc.", 500);
  return apiSuccess({ section: parsed.data.section });
}
