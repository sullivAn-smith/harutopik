import "server-only";

import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateSpeech } from "./azure-speech";
import { getAzureTtsConfig } from "./config";
import {
  audioBucket,
  fileExists,
  getAudioUrl,
  uploadAudio,
} from "./storage";

export { audioBucket };

export function normalizeTtsText(text: string) {
  return text.normalize("NFC").trim();
}

export function audioSourceHash(
  text: string,
  config = getAzureTtsConfig(),
) {
  return createHash("sha256")
    .update(
      [
        config.provider,
        config.voice,
        config.rate,
        config.outputFormat,
        normalizeTtsText(text),
      ].join("|"),
    )
    .digest("hex");
}

export async function enqueueAudioJob(
  admin: SupabaseClient,
  input: { vocabularyId: string; text: string; createdBy: string },
) {
  const config = getAzureTtsConfig();
  const sourceText = normalizeTtsText(input.text);
  const sourceHash = audioSourceHash(sourceText, config);
  const { data: existing } = await admin
    .from("audio_generation_jobs")
    .select("id,status,storage_path,vocabulary_id")
    .eq("provider", config.provider)
    .eq("voice", config.voice)
    .eq("source_hash", sourceHash)
    .maybeSingle();

  if (existing?.status === "completed") {
    return {
      ...existing,
      reused: true,
      inProgress: false,
      sourceHash,
      config,
    };
  }
  if (
    existing?.status === "processing" ||
    existing?.status === "queued"
  ) {
    return {
      ...existing,
      reused: false,
      inProgress: true,
      sourceHash,
      config,
    };
  }
  if (existing) {
    const { error } = await admin
      .from("audio_generation_jobs")
      .update({
        vocabulary_id: input.vocabularyId,
        source_text: sourceText,
        speaking_rate: config.rate,
        output_format: config.outputFormat,
        status: "queued",
        attempts: 0,
        error_message: null,
        storage_path: null,
        started_at: null,
        completed_at: null,
        created_by: input.createdBy,
      })
      .eq("id", existing.id);
    if (error) throw error;
    return {
      ...existing,
      vocabulary_id: input.vocabularyId,
      status: "queued",
      storage_path: null,
      reused: false,
      inProgress: false,
      sourceHash,
      config,
    };
  }

  const { data, error } = await admin
    .from("audio_generation_jobs")
    .insert({
      vocabulary_id: input.vocabularyId,
      source_text: sourceText,
      source_hash: sourceHash,
      provider: config.provider,
      voice: config.voice,
      speaking_rate: config.rate,
      output_format: config.outputFormat,
      status: "queued",
      created_by: input.createdBy,
    })
    .select("id,status,storage_path,vocabulary_id")
    .single();
  if (error || !data) {
    const { data: concurrent } = await admin
      .from("audio_generation_jobs")
      .select("id,status,storage_path,vocabulary_id")
      .eq("provider", config.provider)
      .eq("voice", config.voice)
      .eq("source_hash", sourceHash)
      .maybeSingle();
    if (concurrent) {
      return {
        ...concurrent,
        reused: concurrent.status === "completed",
        inProgress: concurrent.status === "processing",
        sourceHash,
        config,
      };
    }
    throw error ?? new Error("Không thể tạo audio job.");
  }
  return {
    ...data,
    reused: false,
    inProgress: false,
    sourceHash,
    config,
  };
}

export async function processAudioJob(
  admin: SupabaseClient,
  jobId: string,
) {
  const config = getAzureTtsConfig();
  const { data: job, error } = await admin
    .from("audio_generation_jobs")
    .select(
      "id,vocabulary_id,source_text,source_hash,voice,provider,status",
    )
    .eq("id", jobId)
    .single();
  if (error || !job) throw error ?? new Error("Không tìm thấy audio job.");
  if (job.provider !== config.provider || job.voice !== config.voice) {
    throw new Error("Cấu hình TTS của job không còn khớp với hệ thống.");
  }

  const { data: vocabulary } = await admin
    .from("vocabulary_items")
    .select("hangul")
    .eq("id", job.vocabulary_id)
    .maybeSingle();
  if (
    !vocabulary ||
    audioSourceHash(vocabulary.hangul, config) !== job.source_hash
  ) {
    throw new Error("Nội dung từ đã thay đổi; audio job cũ không còn hợp lệ.");
  }

  const storagePath = `${config.provider}/${config.voice}/${job.source_hash}.mp3`;
  let cached = await fileExists(admin, storagePath);
  if (!cached) {
    const audio = await generateSpeech(job.source_text, config);
    await uploadAudio(admin, storagePath, audio);
    cached = false;
  }
  const publicUrl = getAudioUrl(admin, storagePath);
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
      .update({ audio_url: publicUrl, updated_at: now })
      .eq("id", job.vocabulary_id),
  ]);
  if (jobError || vocabularyError) {
    throw jobError ?? vocabularyError ?? new Error("Không thể lưu URL audio.");
  }
  return {
    vocabularyId: job.vocabulary_id,
    publicUrl,
    cached,
    provider: config.provider,
    voice: config.voice,
  };
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
