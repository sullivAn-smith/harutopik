import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

type LessonPayload = {
  vocabulary?: unknown;
  [key: string]: unknown;
};

function updateAudioInPayload(
  payload: unknown,
  vocabularyId: string,
  audioUrl: string,
) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  const lesson = payload as LessonPayload;
  if (!Array.isArray(lesson.vocabulary)) return null;
  let changed = false;
  const vocabulary = lesson.vocabulary.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return item;
    const word = item as Record<string, unknown>;
    if (word.id !== vocabularyId) return item;
    changed = true;
    return { ...word, audioUrl };
  });
  return changed ? { ...lesson, vocabulary } : null;
}

export async function syncPublishedVocabularyAudio(
  admin: SupabaseClient,
  vocabularyId: string,
  audioUrl: string,
) {
  const [{ data: revisions, error: revisionReadError }, { data: catalog, error: catalogReadError }] =
    await Promise.all([
      admin
        .from("content_revisions")
        .select("id,payload")
        .eq("content_type", "lesson"),
      admin
        .from("published_catalog")
        .select("content_id,payload")
        .eq("content_type", "lesson"),
    ]);
  if (revisionReadError || catalogReadError) return false;

  const updates = [
    ...(revisions ?? []).flatMap((revision) => {
      const payload = updateAudioInPayload(
        revision.payload,
        vocabularyId,
        audioUrl,
      );
      return payload
        ? [admin.from("content_revisions").update({ payload }).eq("id", revision.id)]
        : [];
    }),
    ...(catalog ?? []).flatMap((row) => {
      const payload = updateAudioInPayload(
        row.payload,
        vocabularyId,
        audioUrl,
      );
      return payload
        ? [
            admin
              .from("published_catalog")
              .update({ payload })
              .eq("content_id", row.content_id)
              .eq("content_type", "lesson"),
          ]
        : [];
    }),
  ];
  const results = await Promise.all(updates);
  return results.every((result) => !result.error);
}
