import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { SpeedTestArena } from "@/features/speed-test/speed-test-arena";
import { getCurrentUser } from "@/lib/auth/authorize";
import { getPublishedLessonRouteData } from "@/lib/data/published-catalog";
import { createClient } from "@/lib/supabase/server";
import { getDailyBestAccuracy, getVietnamChallengeDate } from "@/lib/speed-test/daily";
import { getRankedAttemptsRemaining } from "@/lib/data/rankings";
import { getRankedSpeedLesson } from "@/lib/rankings/ranked-source";
import { rankedSpeedGameFromQuery } from "@/lib/rankings/speed-ranking";
import { getLessonSpeedTestAccess } from "@/lib/data/lesson-progress";

export const metadata: Metadata = { title: "Speed Test" };
export const dynamic = "force-dynamic";

export default async function LessonSpeedTestPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseSlug: string; lessonSlug: string }>;
  searchParams: Promise<{ game?: string; daily?: string; ranked?: string }>;
}) {
  const [{ courseSlug, lessonSlug }, query] = await Promise.all([
    params,
    searchParams,
  ]);
  const href = `/courses/${encodeURIComponent(courseSlug)}/lessons/${encodeURIComponent(lessonSlug)}`;
  const rankedGame = query.ranked === "1"
    ? rankedSpeedGameFromQuery(query.game)
    : null;
  const [user, data, rankedSource, supabase] = await Promise.all([
    getCurrentUser(),
    getPublishedLessonRouteData(courseSlug, lessonSlug),
    rankedGame ? getRankedSpeedLesson() : Promise.resolve(null),
    createClient(),
  ]);
  if (!user) {
    const speedTestHref = `${href}/speed-test`;
    redirect(`/dang-nhap?next=${encodeURIComponent(speedTestHref)}`);
  }
  if (!data) notFound();
  if (rankedGame) {
    if (
      rankedSource &&
      (
        rankedSource.courseSlug !== courseSlug ||
        rankedSource.lessonSlug !== lessonSlug
      )
    ) {
      redirect(
        `/courses/${encodeURIComponent(rankedSource.courseSlug)}/lessons/${encodeURIComponent(rankedSource.lessonSlug)}/speed-test?game=${query.game}&ranked=1`,
      );
    }
  }
  const vocabularyIds = data.lesson.vocabulary.map((item) => item.id);
  const challengeDate = getVietnamChallengeDate();
  const dailyMode = query.daily === "1";
  const [lessonAccess, progressResult, dailyResult, rankedAttemptsRemaining] = await Promise.all([
    getLessonSpeedTestAccess({
      supabase,
      userId: user.id,
      lesson: data.lesson,
    }),
    vocabularyIds.length && !rankedGame
      ? supabase
          .from("user_word_progress")
          .select("vocabulary_id,mastery_score,wrong_count,near_miss_count,last_wrong_at,average_response_time_ms,last_seen_at,memory_strength")
          .eq("user_id", user.id)
          .in("vocabulary_id", vocabularyIds)
      : Promise.resolve({ data: [] }),
    dailyMode
      ? supabase
          .from("speed_test_attempts")
          .select("accuracy")
          .eq("user_id", user.id)
          .eq("is_daily", true)
          .eq("challenge_date", challengeDate)
          .eq("finish_reason", "completed")
      : Promise.resolve({ data: [] }),
    rankedGame
      ? getRankedAttemptsRemaining(user.id, rankedGame)
      : Promise.resolve(3),
  ]);
  if (!lessonAccess.speedTestUnlocked) {
    redirect(`${href}?speedTest=locked`);
  }
  const progressRows = progressResult.data;
  const dailyRows = dailyResult.data;
  const progressById = Object.fromEntries((progressRows ?? []).map((row) => [row.vocabulary_id, {
    masteryScore: Number(row.mastery_score),
    wrongCount: row.wrong_count,
    nearMissCount: row.near_miss_count,
    lastWrongAt: row.last_wrong_at,
    averageResponseTimeMs: row.average_response_time_ms,
    lastSeenAt: row.last_seen_at,
    memoryStrength: Number(row.memory_strength),
  }]));

  return (
    <SpeedTestArena
      backHref={href}
      initialGame={dailyMode || query.game === "typing" ? "typing" : query.game === "audio" ? "audio" : query.game === "flash" ? "flash" : query.game === "card" ? "card" : "arena"}
      lessonGame={{
        vocabulary: data.lesson.vocabulary,
        lessonName: `Bài ${data.lesson.order}: ${data.lesson.title.vi}`,
        lessonId: data.lesson.id,
        courseSlug,
        lessonSlug,
        progressById,
        challengeDate,
        dailyMode,
        dailyCompletedToday: Boolean(dailyRows?.length),
        dailyBestAccuracy: getDailyBestAccuracy(dailyRows ?? []),
        rankedGame,
        rankedAttemptsRemaining,
        backHref: "/",
      }}
    />
  );
}
