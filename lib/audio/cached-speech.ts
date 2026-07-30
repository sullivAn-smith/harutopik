import "server-only";

import { generateSpeech } from "./azure-speech";
import { audioSourceHash, normalizeTtsText } from "./jobs";
import { getAzureTtsConfig } from "./config";
import { fileExists, getAudioUrl, uploadAudio } from "./storage";
import { createAdminClient } from "@/lib/supabase/admin";

export async function generateCachedSpeech(text: string) {
  const config = getAzureTtsConfig();
  const normalizedText = normalizeTtsText(text);
  if (!normalizedText) throw new Error("Nội dung cần tạo audio đang trống.");
  const hash = audioSourceHash(normalizedText, config);
  const storagePath = `${config.provider}/${config.voice}/${hash}.mp3`;
  const admin = createAdminClient();
  const cached = await fileExists(admin, storagePath);
  if (!cached) {
    const audio = await generateSpeech(normalizedText, config);
    await uploadAudio(admin, storagePath, audio);
  }
  return {
    audioUrl: getAudioUrl(admin, storagePath),
    cached,
    provider: config.provider,
    voice: config.voice,
  };
}
