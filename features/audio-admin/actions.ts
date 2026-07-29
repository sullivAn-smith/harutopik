"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { enqueueAudioJob } from "@/lib/audio/jobs";
import { isAzureTtsConfigured } from "@/lib/audio/config";
import { getAudioUrl } from "@/lib/audio/storage";
import { requirePermission } from "@/lib/auth/authorize";
import { toUserFacingError } from "@/lib/errors/user-facing";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function enqueueMissingVocabularyAudio() {
  const actor = await requirePermission("content:edit");
  if (!isAzureTtsConfigured())
    redirect("/bien-tap/audio?error=not-configured");
  const supabase = await createClient();
  let query = supabase
    .from("vocabulary_items")
    .select("id,hangul,created_by")
    .is("audio_url", null)
    .in("status", ["draft", "changes_requested"])
    .limit(500);
  if (!actor.roles.includes("admin")) query = query.eq("created_by", actor.id);
  const { data: items, error } = await query;
  if (error) {
    const friendly = toUserFacingError(error, "Không thể tải danh sách từ thiếu audio.");
    redirect(`/bien-tap/audio?error=${encodeURIComponent(friendly.message)}`);
  }

  const admin = createAdminClient();
  let queued = 0;
  for (const item of items ?? []) {
    const job = await enqueueAudioJob(admin, {
      vocabularyId: item.id,
      text: item.hangul,
      createdBy: actor.id,
    });
    if (job.reused && job.storage_path) {
      await admin
        .from("vocabulary_items")
        .update({
          audio_url: getAudioUrl(admin, job.storage_path),
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id);
    }
    if (!job.reused && !job.inProgress) queued += 1;
  }
  await admin.from("audit_logs").insert({
    actor_id: actor.id,
    action: "vocabulary.audio.batch_queued",
    entity_type: "audio_generation_job",
    entity_id: actor.id,
    metadata: { queued_count: queued },
  });
  revalidatePath("/bien-tap/audio");
  redirect(`/bien-tap/audio?queued=${queued}`);
}
