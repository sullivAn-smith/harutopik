import { apiError, apiSuccess } from "@/lib/api/responses";
import { getApiActor } from "@/lib/api/auth";
import {
  generateVocabularyAudioForActor,
  VocabularyAudioError,
} from "@/lib/audio/service";
import { isAzureTtsConfigured } from "@/lib/audio/config";
import { roles, type AppRole } from "@/lib/auth/permissions";

export const maxDuration = 60;

type RouteContext = {
  params: Promise<{ vocabularyId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const actor = await getApiActor(request);
  if (!actor) {
    return apiError("UNAUTHENTICATED", "Bạn cần đăng nhập.", 401);
  }
  if (!isAzureTtsConfigured()) {
    return apiError(
      "TTS_NOT_CONFIGURED",
      "Azure Speech chưa được cấu hình trên server.",
      503,
    );
  }

  const { data: assigned } = await actor.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", actor.user.id);
  const actorRoles = (assigned ?? [])
    .map((item) => item.role)
    .filter((role): role is AppRole => roles.includes(role as AppRole));
  const { vocabularyId } = await context.params;

  try {
    const result = await generateVocabularyAudioForActor({
      vocabularyId,
      actorId: actor.user.id,
      actorRoles,
      supabase: actor.supabase,
    });
    if (result.status === "processing") {
      return apiSuccess(result, { status: 202 });
    }
    return apiSuccess(result);
  } catch (error) {
    if (error instanceof VocabularyAudioError) {
      return apiError(error.code, error.message, error.status);
    }
    console.error("Unexpected vocabulary audio API error.", error);
    return apiError(
      "AUDIO_GENERATION_FAILED",
      "Chưa thể tạo audio. Hãy thử lại sau.",
      500,
    );
  }
}
