"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/authorize";
import { publishedLearningCacheTag } from "@/lib/data/published-cache";
import { createAdminClient } from "@/lib/supabase/admin";

const inputSchema = z.object({
  lessonId: z.string().trim().min(1).max(200),
  vocabularyIds: z.array(z.string().trim().min(1).max(240)).min(1).max(2_000),
});

type LessonSnapshot = {
  vocabulary?: unknown;
  [key: string]: unknown;
};

function clearImagesFromPayload(payload: unknown, vocabularyIds: Set<string>) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  const snapshot = payload as LessonSnapshot;
  if (!Array.isArray(snapshot.vocabulary)) return null;

  let changed = false;
  const vocabulary = snapshot.vocabulary.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return item;
    const entry = item as Record<string, unknown>;
    if (typeof entry.id !== "string" || !vocabularyIds.has(entry.id)) {
      return item;
    }
    changed = true;
    const next = { ...entry };
    delete next.imageUrl;
    return next;
  });

  return changed ? { ...snapshot, vocabulary } : null;
}

export type BulkVocabularyImageResult =
  | { ok: true; clearedCount: number; message: string }
  | { ok: false; message: string };

export async function clearPublishedLessonVocabularyImages(
  lessonId: string,
  vocabularyIds: string[],
): Promise<BulkVocabularyImageResult> {
  const actor = await requirePermission("content:publish");
  const parsed = inputSchema.safeParse({ lessonId, vocabularyIds });
  if (!parsed.success) {
    return { ok: false, message: "Danh sách từ cần xoá ảnh chưa hợp lệ." };
  }

  const ids = [...new Set(parsed.data.vocabularyIds)];
  const idSet = new Set(ids);
  const admin = createAdminClient();
  const { data: published, error: publishedError } = await admin
    .from("published_catalog")
    .select("payload")
    .eq("content_id", parsed.data.lessonId)
    .eq("content_type", "lesson")
    .maybeSingle();
  const lessonPayload = published?.payload as LessonSnapshot | null | undefined;
  const lessonVocabulary = Array.isArray(lessonPayload?.vocabulary)
    ? lessonPayload.vocabulary
    : [];
  const lessonVocabularyIds = new Set(
    lessonVocabulary.flatMap((item) =>
      item && typeof item === "object" && !Array.isArray(item) &&
      typeof (item as Record<string, unknown>).id === "string"
        ? [(item as Record<string, unknown>).id as string]
        : [],
    ),
  );
  if (publishedError || ids.some((id) => !lessonVocabularyIds.has(id))) {
    return {
      ok: false,
      message: "Danh sách từ đã thay đổi. Hãy tải lại trang rồi chọn lại.",
    };
  }

  const now = new Date().toISOString();
  const { error: vocabularyError } = await admin
    .from("vocabulary_items")
    .update({ image_url: null, updated_at: now })
    .in("id", ids);
  if (vocabularyError) {
    return { ok: false, message: "Chưa xoá được ảnh từ vựng. Hãy thử lại." };
  }

  const { data: revisions, error: revisionsError } = await admin
    .from("content_revisions")
    .select("id,payload")
    .eq("content_type", "lesson");
  if (revisionsError) {
    return { ok: false, message: "Ảnh đã xoá nhưng bản biên tập chưa đồng bộ được." };
  }
  const revisionUpdates = (revisions ?? []).flatMap((revision) => {
    const payload = clearImagesFromPayload(revision.payload, idSet);
    return payload
      ? [admin.from("content_revisions").update({ payload }).eq("id", revision.id)]
      : [];
  });
  const revisionResults = await Promise.all(revisionUpdates);
  if (revisionResults.some((result) => result.error)) {
    return { ok: false, message: "Ảnh đã xoá nhưng bản biên tập chưa đồng bộ hết." };
  }

  const { data: catalogRows, error: catalogError } = await admin
    .from("published_catalog")
    .select("content_id,payload")
    .eq("content_type", "lesson");
  if (catalogError) {
    return { ok: false, message: "Ảnh đã xoá nhưng trang học viên chưa đồng bộ được." };
  }
  const catalogUpdates = (catalogRows ?? []).flatMap((row) => {
    const payload = clearImagesFromPayload(row.payload, idSet);
    return payload
      ? [
          admin
            .from("published_catalog")
            .update({ payload, published_at: now })
            .eq("content_id", row.content_id)
            .eq("content_type", "lesson"),
        ]
      : [];
  });
  const catalogResults = await Promise.all(catalogUpdates);
  if (catalogResults.some((result) => result.error)) {
    return { ok: false, message: "Ảnh đã xoá nhưng trang học viên chưa đồng bộ hết." };
  }

  await admin.from("audit_logs").insert({
    actor_id: actor.id,
    action: "vocabulary.images.bulk_cleared",
    entity_type: "lesson",
    entity_id: parsed.data.lessonId,
    metadata: { vocabulary_ids: ids, cleared_count: ids.length },
  });

  revalidatePath("/quan-tri", "layout");
  revalidatePath("/bien-tap", "layout");
  revalidatePath("/xem-truoc", "layout");
  revalidatePath("/courses", "layout");
  revalidatePath("/", "layout");
  revalidateTag(publishedLearningCacheTag, { expire: 0 });
  return {
    ok: true,
    clearedCount: ids.length,
    message: `Đã xoá ảnh của ${ids.length} từ và đồng bộ cho biên tập, học viên.`,
  };
}
