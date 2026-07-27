import "server-only";

import { requirePermission } from "@/lib/auth/authorize";
import { createClient } from "@/lib/supabase/server";

export async function getAudioDashboard() {
  const actor = await requirePermission("content:read-draft");
  const supabase = await createClient();
  let vocabularyQuery = supabase
    .from("vocabulary_items")
    .select("id,hangul,primary_meaning_vi,audio_url,created_by")
    .in("status", ["draft", "changes_requested"])
    .order("updated_at", { ascending: false })
    .limit(500);
  if (!actor.roles.includes("admin"))
    vocabularyQuery = vocabularyQuery.eq("created_by", actor.id);
  const [{ data: vocabulary }, { data: jobs }] = await Promise.all([
    vocabularyQuery,
    supabase
      .from("audio_generation_jobs")
      .select(
        "id,vocabulary_id,source_text,voice,status,attempts,error_message,created_at,completed_at",
      )
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  const items = vocabulary ?? [];
  const audioJobs = jobs ?? [];
  return {
    total: items.length,
    ready: items.filter((item) => item.audio_url).length,
    missing: items.filter((item) => !item.audio_url).length,
    queued: audioJobs.filter((job) => job.status === "queued").length,
    processing: audioJobs.filter((job) => job.status === "processing").length,
    failed: audioJobs.filter((job) => job.status === "failed").length,
    jobs: audioJobs,
  };
}
