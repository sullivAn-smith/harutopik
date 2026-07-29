import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export const audioBucket = "vocabulary-audio";

export function getAudioUrl(admin: SupabaseClient, storagePath: string) {
  return admin.storage.from(audioBucket).getPublicUrl(storagePath).data
    .publicUrl;
}

export async function fileExists(
  admin: SupabaseClient,
  storagePath: string,
) {
  const separator = storagePath.lastIndexOf("/");
  const directory = storagePath.slice(0, separator);
  const fileName = storagePath.slice(separator + 1);
  const { data, error } = await admin.storage
    .from(audioBucket)
    .list(directory, { limit: 1, search: fileName });
  if (error) throw error;
  return Boolean(data?.some((item) => item.name === fileName));
}

export async function uploadAudio(
  admin: SupabaseClient,
  storagePath: string,
  audio: Buffer,
) {
  const { error } = await admin.storage
    .from(audioBucket)
    .upload(storagePath, audio, {
      contentType: "audio/mpeg",
      cacheControl: "31536000",
      upsert: false,
    });
  if (error && !/already exists|duplicate/i.test(error.message)) throw error;
  return getAudioUrl(admin, storagePath);
}
