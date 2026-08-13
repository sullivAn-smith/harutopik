import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SpeedTestExperience } from "@/features/speed-test/speed-test-experience";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { vocabularyItemSchema } from "@/content/schema";
import { getDailyBestAccuracy, getVietnamChallengeDate } from "@/lib/speed-test/daily";

export const metadata: Metadata = { title: "Speed Test" };
export const dynamic = "force-dynamic";

export default async function SpeedTestPage({ searchParams }: { searchParams: Promise<{ listId?: string; daily?: string }> }) {
  if (!isSupabaseConfigured()) redirect("/dang-nhap?next=%2Fspeed-test");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/dang-nhap?next=%2Fspeed-test");
  const { listId, daily } = await searchParams;
  const challengeDate = getVietnamChallengeDate();
  const [{ data: lists }, { data: items }, { data: progressRows }, { data: dailyRows }] = await Promise.all([
    supabase.from("vocabulary_lists").select("id,name,kind").eq("user_id", user.id).order("kind").order("created_at"),
    supabase.from("vocabulary_list_items").select("list_id,vocabulary_id,snapshot,created_at").eq("user_id", user.id).order("created_at"),
    supabase.from("user_word_progress").select("vocabulary_id,mastery_score,wrong_count,near_miss_count,last_wrong_at").eq("user_id", user.id),
    supabase.from("speed_test_attempts").select("accuracy").eq("user_id", user.id).eq("is_daily", true).eq("challenge_date", challengeDate).eq("finish_reason", "completed"),
  ]);
  const payload = (lists ?? []).map((list) => ({
    id: list.id,
    name: list.name,
    items: (items ?? []).filter((row) => row.list_id === list.id).flatMap((row) => {
      const parsed = vocabularyItemSchema.safeParse(row.snapshot);
      return parsed.success ? [{ ...parsed.data, id: row.vocabulary_id }] : [];
    }),
  })).filter((list) => list.items.length > 0);
  const progressById = Object.fromEntries((progressRows ?? []).map((row) => [row.vocabulary_id, {
    masteryScore: Number(row.mastery_score),
    wrongCount: row.wrong_count,
    nearMissCount: row.near_miss_count,
    lastWrongAt: row.last_wrong_at,
  }]));
  return <SpeedTestExperience lists={payload} initialListId={listId} initialDailyMode={daily === "1"} progressById={progressById} challengeDate={challengeDate} dailyCompletedToday={Boolean(dailyRows?.length)} dailyBestAccuracy={getDailyBestAccuracy(dailyRows ?? [])} />;
}
