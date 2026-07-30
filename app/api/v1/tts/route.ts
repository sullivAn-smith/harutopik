import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api/responses";
import { getApiActor } from "@/lib/api/auth";
import { generateCachedSpeech } from "@/lib/audio/cached-speech";
import { isAzureTtsConfigured } from "@/lib/audio/config";
import { hasPermission, roles, type AppRole } from "@/lib/auth/permissions";

export const maxDuration = 60;

const requestSchema = z.object({
  text: z.string().trim().min(1).max(500),
});

export async function POST(request: Request) {
  const actor = await getApiActor(request);
  if (!actor) return apiError("UNAUTHENTICATED", "Bạn cần đăng nhập.", 401);
  const { data: assigned } = await actor.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", actor.user.id);
  const actorRoles = (assigned ?? [])
    .map(({ role }) => role)
    .filter((role): role is AppRole => roles.includes(role as AppRole));
  if (!hasPermission(actorRoles, "content:edit")) {
    return apiError("FORBIDDEN", "Bạn không có quyền tạo audio nội dung.", 403);
  }
  if (!isAzureTtsConfigured()) {
    return apiError(
      "TTS_NOT_CONFIGURED",
      "Azure Speech chưa được cấu hình trên server.",
      503,
    );
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Nội dung TTS phải có từ 1 đến 500 ký tự.",
      400,
    );
  }
  try {
    return apiSuccess(await generateCachedSpeech(parsed.data.text));
  } catch (error) {
    console.error("Sentence TTS generation failed.", error);
    return apiError(
      "TTS_GENERATION_FAILED",
      error instanceof Error ? error.message : "Chưa thể tạo audio.",
      502,
    );
  }
}
