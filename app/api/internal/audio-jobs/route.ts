import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { failAudioJob, processAudioJob } from "@/lib/audio/jobs";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

function authorized(request: Request) {
  const configured = process.env.AUDIO_WORKER_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!configured || !supplied) return false;
  const expected = Buffer.from(configured);
  const actual = Buffer.from(supplied);
  return (
    expected.length === actual.length && timingSafeEqual(expected, actual)
  );
}

export async function POST(request: Request) {
  if (!authorized(request))
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (
    !process.env.GOOGLE_CLOUD_TTS_API_KEY ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  )
    return NextResponse.json({ error: "NOT_CONFIGURED" }, { status: 503 });

  const admin = createAdminClient();
  const processed: string[] = [];
  const failed: string[] = [];
  for (let index = 0; index < 5; index += 1) {
    const { data, error } = await admin.rpc("claim_audio_generation_job");
    const job = data?.[0];
    if (error)
      return NextResponse.json(
        { error: "CLAIM_FAILED", processed, failed },
        { status: 500 },
      );
    if (!job) break;
    try {
      await processAudioJob(admin, job.id);
      processed.push(job.id);
    } catch (jobError) {
      await failAudioJob(admin, job.id, jobError);
      failed.push(job.id);
    }
  }
  return NextResponse.json({ processed, failed });
}
