import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { SpeedTestExperience } from "@/features/speed-test/speed-test-experience";
import { getCurrentActor } from "@/lib/auth/authorize";
import { getPublishedLessonRouteData } from "@/lib/data/published-catalog";
import { createClient } from "@/lib/supabase/server";
import { getDailyBestAccuracy, getVietnamChallengeDate } from "@/lib/speed-test/daily";

export const metadata: Metadata = { title: "Speed Test bài học" };
export const dynamic = "force-dynamic";

export default async function LessonSpeedTestPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseSlug: string; lessonSlug: string }>;
  searchParams: Promise<{ daily?: string }>;
}) {
  const { courseSlug, lessonSlug } = await params;
  const { daily } = await searchParams;
  const initialDailyMode = daily === "1";
  const href = `/courses/${encodeURIComponent(courseSlug)}/lessons/${encodeURIComponent(lessonSlug)}`;
  const [actor, data] = await Promise.all([
    getCurrentActor(),
    getPublishedLessonRouteData(courseSlug, lessonSlug),
  ]);
  if (!actor) {
    const speedTestHref = `${href}/speed-test${initialDailyMode ? "?daily=1" : ""}`;
    redirect(`/dang-nhap?next=${encodeURIComponent(speedTestHref)}`);
  }
  if (!data) notFound();
  const supabase = await createClient();
  const vocabularyIds = data.lesson.vocabulary.map((item) => item.id);
  const challengeDate = getVietnamChallengeDate();
  const [{ data: progressRows }, { data: dailyRows }] = await Promise.all([
    vocabularyIds.length ? supabase
        .from("user_word_progress")
        .select("vocabulary_id,mastery_score,wrong_count,near_miss_count,last_wrong_at")
        .eq("user_id", actor.id)
        .in("vocabulary_id", vocabularyIds) : Promise.resolve({ data: [] }),
    supabase.from("speed_test_attempts").select("accuracy").eq("user_id", actor.id).eq("is_daily", true).eq("challenge_date", challengeDate).eq("finish_reason", "completed"),
  ]);
  const progressById = Object.fromEntries((progressRows ?? []).map((row) => [row.vocabulary_id, {
    masteryScore: Number(row.mastery_score),
    wrongCount: row.wrong_count,
    nearMissCount: row.near_miss_count,
    lastWrongAt: row.last_wrong_at,
  }]));

  return (
    <SpeedTestExperience
      lists={[
        {
          id: data.lesson.id,
          name: `Bài ${data.lesson.order}: ${data.lesson.title.vi}`,
          items: data.lesson.vocabulary,
        },
      ]}
      initialListId={data.lesson.id}
      initialDailyMode={initialDailyMode}
      fixedSource={{ kind: "lesson", courseSlug, lessonSlug }}
      progressById={progressById}
      challengeDate={challengeDate}
      dailyCompletedToday={Boolean(dailyRows?.length)}
      dailyBestAccuracy={getDailyBestAccuracy(dailyRows ?? [])}
      backHref={href}
      backLabel="Về bài học"
    />
  );
}
