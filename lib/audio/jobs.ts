import "server-only";

import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { synthesizeGoogleTts } from "./google-tts";

export const audioBucket = "vocabulary-audio";
export const audioProvider = "google_cloud_tts";

export function getAudioVoice() {
  return process.env.GOOGLE_CLOUD_TTS_VOICE || "ko-KR-Neural2-A";
}

export function audioSourceHash(text: string, voice = getAudioVoice()) {
  return createHash("sha256")
    .update([audioProvider, voice, text].join("|"))
    .digest("hex");
}

export async function enqueueAudioJob(
  admin: SupabaseClient,
  input: { vocabularyId: string; text: string; createdBy: string },
) {
  const voice = getAudioVoice();
  const sourceHash = audioSourceHash(input.text, voice);
  const { data: existing } = await admin
    .from("audio_generation_jobs")
    .select("id,status,storage_path")
    .eq("vocabulary_id", input.vocabularyId)
    .eq("provider", audioProvider)
    .eq("voice", voice)
    .eq("source_hash", sourceHash)
    .maybeSingle();
  if (existing?.status === "completed")
    return { ...existing, reused: true, sourceHash, voice };
  if (existing) {
    const { error } = await admin
      .from("audio_generation_jobs")
      .update({
        status: "queued",
        attempts: 0,
        error_message: null,
        started_at: null,
        completed_at: null,
      })
      .eq("id", existing.id);
    if (error) throw error;
    return { ...existing, status: "queued", reused: false, sourceHash, voice };
  }
  const { data, error } = await admin
    .from("audio_generation_jobs")
    .insert({
      vocabulary_id: input.vocabularyId,
      source_text: input.text,
      source_hash: sourceHash,
      provider: audioProvider,
      voice,
      status: "queued",
      created_by: input.createdBy,
    })
    .select("id,status,storage_path")
    .single();
  if (error || !data) throw error ?? new Error("Không thể tạo audio job.");
  return { ...data, reused: false, sourceHash, voice };
}

export async function processAudioJob(admin: SupabaseClient, jobId: string) {
  const apiKey = process.env.GOOGLE_CLOUD_TTS_API_KEY;
  if (!apiKey) throw new Error("Thiếu GOOGLE_CLOUD_TTS_API_KEY.");
  const { data: job, error } = await admin
    .from("audio_generation_jobs")
    .select("id,vocabulary_id,source_text,source_hash,voice,status")
    .eq("id", jobId)
    .single();
  if (error || !job) throw error ?? new Error("Không tìm thấy audio job.");

  const { data: vocabulary } = await admin
    .from("vocabulary_items")
    .select("hangul")
    .eq("id", job.vocabulary_id)
    .maybeSingle();
  if (
    !vocabulary ||
    audioSourceHash(vocabulary.hangul, job.voice) !== job.source_hash
  ) {
    throw new Error("Nội dung từ đã thay đổi; audio job cũ không còn hợp lệ.");
  }

  const storagePath = `words/${job.vocabulary_id}/${job.source_hash}.mp3`;
  const audio = await synthesizeGoogleTts({
    apiKey,
    text: job.source_text,
    voice: job.voice,
  });
  const { error: uploadError } = await admin.storage
    .from(audioBucket)
    .upload(storagePath, audio, {
      contentType: "audio/mpeg",
      cacheControl: "31536000",
      upsert: false,
    });
  if (uploadError && !/already exists|duplicate/i.test(uploadError.message))
    throw uploadError;

  const { data: asset } = admin.storage
    .from(audioBucket)
    .getPublicUrl(storagePath);
  const now = new Date().toISOString();
  const [{ error: jobError }, { error: vocabularyError }] = await Promise.all([
    admin
      .from("audio_generation_jobs")
      .update({
        status: "completed",
        storage_path: storagePath,
        error_message: null,
        completed_at: now,
      })
      .eq("id", job.id),
    admin
      .from("vocabulary_items")
      .update({ audio_url: asset.publicUrl, updated_at: now })
      .eq("id", job.vocabulary_id),
  ]);
  if (jobError || vocabularyError)
    throw jobError ?? vocabularyError ?? new Error("Không thể lưu URL audio.");
  return { vocabularyId: job.vocabulary_id, publicUrl: asset.publicUrl };
}

export async function failAudioJob(
  admin: SupabaseClient,
  jobId: string,
  error: unknown,
) {
  await admin
    .from("audio_generation_jobs")
    .update({
      status: "failed",
      error_message:
        error instanceof Error ? error.message.slice(0, 500) : "unknown_error",
    })
    .eq("id", jobId);
}
