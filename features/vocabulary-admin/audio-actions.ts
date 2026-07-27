"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  audioBucket,
  enqueueAudioJob,
  failAudioJob,
  processAudioJob,
} from "@/lib/audio/jobs";
import { requirePermission } from "@/lib/auth/authorize";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function resultUrl(vocabularyId: string, result: string) {
  return `/bien-tap/tu-vung/${vocabularyId}?audio=${result}`;
}

export async function generateVocabularyAudio(formData: FormData) {
  const actor = await requirePermission("content:edit");
  const vocabularyId = formData.get("vocabularyId");
  if (typeof vocabularyId !== "string" || !vocabularyId)
    redirect("/bien-tap/tu-vung");

  const supabase = await createClient();
  const { data: item } = await supabase
    .from("vocabulary_items")
    .select("id,hangul,status,created_by")
    .eq("id", vocabularyId)
    .maybeSingle();
  if (
    !item ||
    !["draft", "changes_requested"].includes(item.status) ||
    (item.created_by !== actor.id && !actor.roles.includes("admin"))
  ) {
    redirect(resultUrl(vocabularyId, "forbidden"));
  }

  const apiKey = process.env.GOOGLE_CLOUD_TTS_API_KEY;
  if (!apiKey) redirect(resultUrl(vocabularyId, "not-configured"));

  const admin = createAdminClient();
  const job = await enqueueAudioJob(admin, {
    vocabularyId,
    text: item.hangul,
    createdBy: actor.id,
  });
  if (job.reused && job.storage_path) {
    const { data } = admin.storage
      .from(audioBucket)
      .getPublicUrl(job.storage_path);
    await admin
      .from("vocabulary_items")
      .update({ audio_url: data.publicUrl, updated_at: new Date().toISOString() })
      .eq("id", vocabularyId);
    revalidatePath(`/bien-tap/tu-vung/${vocabularyId}`);
    redirect(resultUrl(vocabularyId, "reused"));
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
    await processAudioJob(admin, job.id);
  } catch (error) {
    await failAudioJob(admin, job.id, error);
    redirect(resultUrl(vocabularyId, "failed"));
  }
  await admin.from("audit_logs").insert({
    actor_id: actor.id,
    action: "vocabulary.audio.generated",
    entity_type: "vocabulary",
    entity_id: vocabularyId,
    metadata: { job_id: job.id },
  });
  revalidatePath("/bien-tap/tu-vung");
  revalidatePath(`/bien-tap/tu-vung/${vocabularyId}`);
  redirect(resultUrl(vocabularyId, "generated"));
}
