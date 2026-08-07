import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppRole } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  enqueueAudioJob,
  failAudioJob,
  processAudioJob,
} from "./jobs";
import { getAudioUrl } from "./storage";
import type { AudioGenerationResult } from "./types";
import { syncPublishedVocabularyAudio } from "@/lib/vocabulary/sync-published-audio";

export type VocabularyAudioServiceResult =
  | ({ status: "ready" } & AudioGenerationResult)
  | { status: "processing"; jobId: string };

export class VocabularyAudioError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "VocabularyAudioError";
  }
}

export async function generateVocabularyAudioForActor(input: {
  vocabularyId: string;
  actorId: string;
  actorRoles: readonly AppRole[];
  supabase: SupabaseClient;
}): Promise<VocabularyAudioServiceResult> {
  if (
    !input.actorRoles.includes("content_editor") &&
    !input.actorRoles.includes("admin")
  ) {
    throw new VocabularyAudioError(
      "Bạn không có quyền tạo audio.",
      "FORBIDDEN",
      403,
    );
  }

  const { data: item, error } = await input.supabase
    .from("vocabulary_items")
    .select("id,hangul,status,created_by")
    .eq("id", input.vocabularyId)
    .maybeSingle();
  if (error) {
    throw new VocabularyAudioError(
      "Chưa thể đọc dữ liệu từ vựng.",
      "VOCABULARY_READ_FAILED",
      500,
    );
  }
  if (!item) {
    throw new VocabularyAudioError(
      "Không tìm thấy từ vựng.",
      "VOCABULARY_NOT_FOUND",
      404,
    );
  }
  const isAdmin = input.actorRoles.includes("admin");
  const isOwner = item.created_by === input.actorId;
  const canReplacePublishedAudio = item.status === "published";
  const canEditDraftAudio = ["draft", "changes_requested"].includes(
    item.status,
  );
  if (
    (!canEditDraftAudio && !canReplacePublishedAudio) ||
    (!isOwner && !isAdmin)
  ) {
    throw new VocabularyAudioError(
      "Bạn chỉ có thể tạo audio cho từ do mình quản lý. Từ dữ liệu cũ cần admin thực hiện.",
      "FORBIDDEN",
      403,
    );
  }

  const admin = createAdminClient();
  const job = await enqueueAudioJob(admin, {
    vocabularyId: item.id,
    text: item.hangul,
    createdBy: input.actorId,
  });
  if (job.reused && job.storage_path) {
    const audioUrl = getAudioUrl(admin, job.storage_path);
    await admin
      .from("vocabulary_items")
      .update({ audio_url: audioUrl, updated_at: new Date().toISOString() })
      .eq("id", item.id);
    const snapshotsSynced = await syncPublishedVocabularyAudio(
      admin,
      item.id,
      audioUrl,
    );
    if (!snapshotsSynced) {
      throw new VocabularyAudioError(
        "Audio đã tạo nhưng chưa đồng bộ được sang bài học. Hãy thử lại.",
        "AUDIO_SYNC_FAILED",
        500,
      );
    }
    return {
      status: "ready",
      audioUrl,
      cached: true,
      provider: job.config.provider,
      voice: job.config.voice,
    };
  }
  if (job.inProgress) {
    return { status: "processing", jobId: job.id };
  }

  try {
    await admin
      .from("audio_generation_jobs")
      .update({
        status: "processing",
        attempts: 1,
        started_at: new Date().toISOString(),
      })
      .eq("id", job.id);
    const result = await processAudioJob(admin, job.id);
    if (result.vocabularyId !== item.id) {
      await admin
        .from("vocabulary_items")
        .update({
          audio_url: result.publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id);
    }
    const snapshotsSynced = await syncPublishedVocabularyAudio(
      admin,
      item.id,
      result.publicUrl,
    );
    if (!snapshotsSynced) {
      throw new Error("Audio đã tạo nhưng chưa đồng bộ được sang bài học.");
    }
    await admin.from("audit_logs").insert({
      actor_id: input.actorId,
      action: "vocabulary.audio.generated",
      entity_type: "vocabulary",
      entity_id: item.id,
      metadata: {
        job_id: job.id,
        provider: result.provider,
        voice: result.voice,
        cached: result.cached,
      },
    });
    return {
      status: "ready",
      audioUrl: result.publicUrl,
      cached: result.cached,
      provider: result.provider,
      voice: result.voice,
    };
  } catch (generationError) {
    await failAudioJob(admin, job.id, generationError);
    throw new VocabularyAudioError(
      generationError instanceof Error
        ? generationError.message
        : "Chưa thể tạo audio.",
      "AUDIO_GENERATION_FAILED",
      502,
    );
  }
}
