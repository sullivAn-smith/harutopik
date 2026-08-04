import { z } from "zod";
import { getApiActor } from "@/lib/api/auth";
import { apiError, apiSuccess } from "@/lib/api/responses";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({ section: z.enum(["listening", "reading"]) });

export async function POST(request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const actor = await getApiActor(request);
  if (!actor) return apiError("UNAUTHENTICATED", "Bạn cần đăng nhập.", 401);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Phần thi không hợp lệ.", 400);
  const { attemptId } = await params;
  const admin = createAdminClient();
  const { data: attempt } = await admin.from("exam_attempts")
    .select("id,user_id,status,expires_at,question_snapshot")
    .eq("id", attemptId).maybeSingle();
  if (!attempt || attempt.user_id !== actor.user.id) return apiError("NOT_FOUND", "Không tìm thấy lượt thi.", 404);
  if (attempt.status !== "in_progress") return apiError("EXAM_FINISHED", "Lượt thi này đã kết thúc.", 409);
  if (!attempt.expires_at || Date.parse(attempt.expires_at) <= Date.now()) {
    return apiError("EXAM_EXPIRED", "Thời gian làm bài đã kết thúc.", 409);
  }
  const sectionExists = (attempt.question_snapshot as Array<{ section?: string }>).some(
    (question) => question.section === parsed.data.section,
  );
  if (!sectionExists) return apiError("SECTION_UNAVAILABLE", "Phần thi này không có trong chế độ bạn đã chọn.", 409);
  const { error } = await admin.from("exam_attempts").update({
    current_section: parsed.data.section,
    current_position: 1,
    updated_at: new Date().toISOString(),
  }).eq("id", attemptId).eq("status", "in_progress");
  if (error) return apiError("SECTION_START_FAILED", "Chưa thể chuyển phần thi.", 500);
  return apiSuccess({ section: parsed.data.section });
}
