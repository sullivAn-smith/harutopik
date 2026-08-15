import { revalidatePath, revalidateTag } from "next/cache";
import { apiError, apiSuccess } from "@/lib/api/responses";
import { getApiActor } from "@/lib/api/auth";
import { generateCachedSpeech } from "@/lib/audio/cached-speech";
import { isAzureTtsConfigured } from "@/lib/audio/config";
import { hasPermission, roles, type AppRole } from "@/lib/auth/permissions";
import { publishedLearningCacheTag } from "@/lib/data/published-cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncPublishedVocabularyExampleAudio } from "@/lib/vocabulary/sync-published-audio";

export const maxDuration = 60;

type RouteContext = {
  params: Promise<{ vocabularyId: string; exampleId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const actor = await getApiActor(request);
  if (!actor) return apiError("UNAUTHENTICATED", "Bạn cần đăng nhập.", 401);

  const { data: assigned } = await actor.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", actor.user.id);
  const actorRoles = (assigned ?? [])
    .map(({ role }) => role)
    .filter((role): role is AppRole => roles.includes(role as AppRole));
  if (!hasPermission(actorRoles, "content:publish")) {
    return apiError(
      "FORBIDDEN",
      "Bạn không có quyền tạo audio cho câu ví dụ đang phát hành.",
      403,
    );
  }
  if (!isAzureTtsConfigured()) {
    return apiError(
      "TTS_NOT_CONFIGURED",
      "Azure Speech chưa được cấu hình trên server.",
      503,
    );
  }

  const { vocabularyId, exampleId } = await context.params;
  const admin = createAdminClient();
  const { data: example, error: readError } = await admin
    .from("vocabulary_examples")
    .select("id,vocabulary_id,korean,audio_url")
    .eq("id", exampleId)
    .eq("vocabulary_id", vocabularyId)
    .maybeSingle();
  if (readError) {
    return apiError(
      "EXAMPLE_READ_FAILED",
      "Chưa thể đọc câu ví dụ. Hãy thử lại.",
      500,
    );
  }
  if (!example) {
    return apiError(
      "EXAMPLE_NOT_FOUND",
      "Không tìm thấy câu ví dụ của từ này.",
      404,
    );
  }

  try {
    const generated = await generateCachedSpeech(example.korean);
    const { error: updateError } = await admin
      .from("vocabulary_examples")
      .update({ audio_url: generated.audioUrl })
      .eq("id", example.id)
      .eq("vocabulary_id", vocabularyId);
    if (updateError) {
      return apiError(
        "EXAMPLE_AUDIO_SAVE_FAILED",
        "Audio đã tạo nhưng chưa lưu được vào câu ví dụ. Hãy thử lại.",
        500,
      );
    }

    const snapshotsSynced = await syncPublishedVocabularyExampleAudio(
      admin,
      vocabularyId,
      example.id,
      generated.audioUrl,
    );
    if (!snapshotsSynced) {
      return apiError(
        "EXAMPLE_AUDIO_SYNC_FAILED",
        "Audio đã lưu nhưng chưa đồng bộ được sang bài học. Hãy thử lại.",
        500,
      );
    }

    await admin.from("audit_logs").insert({
      actor_id: actor.user.id,
      action: "vocabulary.example.audio.generated",
      entity_type: "vocabulary_example",
      entity_id: example.id,
      metadata: {
        vocabulary_id: vocabularyId,
        cached: generated.cached,
        provider: generated.provider,
        voice: generated.voice,
      },
    });
    revalidatePath("/quan-tri", "layout");
    revalidatePath("/xem-truoc", "layout");
    revalidatePath("/courses", "layout");
    revalidatePath("/", "layout");
    revalidateTag(publishedLearningCacheTag, { expire: 0 });
    return apiSuccess(generated);
  } catch (error) {
    console.error("Vocabulary example TTS generation failed.", error);
    return apiError(
      "EXAMPLE_AUDIO_GENERATION_FAILED",
      error instanceof Error ? error.message : "Chưa thể tạo audio ví dụ.",
      502,
    );
  }
}
