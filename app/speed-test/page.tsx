import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SpeedTestArena } from "@/features/speed-test/speed-test-arena";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { getPublishedCourseShells } from "@/lib/data/published-catalog";
import { getRankedSpeedLesson } from "@/lib/rankings/ranked-source";
import { rankedSpeedGameFromQuery } from "@/lib/rankings/speed-ranking";

export const metadata: Metadata = { title: "Speed Test Arena" };
export const dynamic = "force-dynamic";

export default async function SpeedTestPage({ searchParams }: { searchParams: Promise<{ daily?: string; game?: string; ranked?: string }> }) {
  if (!isSupabaseConfigured()) redirect("/dang-nhap?next=%2Fspeed-test");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/dang-nhap?next=%2Fspeed-test");
  const { daily, game, ranked } = await searchParams;
  if (ranked === "1") {
    const rankedGame = rankedSpeedGameFromQuery(game);
    const source = await getRankedSpeedLesson();
    if (rankedGame && source) {
      redirect(
        `/courses/${encodeURIComponent(source.courseSlug)}/lessons/${encodeURIComponent(source.lessonSlug)}/speed-test?game=${game}&ranked=1`,
      );
    }
  }
  const [courses, { data: progressRows }] = await Promise.all([
    getPublishedCourseShells(),
    supabase
      .from("lesson_progress")
      .select("lesson_id,completion_percent,speed_test_unlocked_at")
      .eq("user_id", user.id),
  ]);
  const progressByLesson = new Map(
    (progressRows ?? []).map((progress) => [progress.lesson_id, progress]),
  );
  const audioLessons = courses.flatMap((course) => course.lessons.map((lesson) => ({
    id: lesson.id,
    courseSlug: course.slug,
    lessonSlug: lesson.slug,
    name: `Bài ${lesson.order}: ${lesson.title.vi}`,
    completionPercent: Number(
      progressByLesson.get(lesson.id)?.completion_percent ?? 0,
    ),
    speedTestUnlocked: Boolean(
      progressByLesson.get(lesson.id)?.speed_test_unlocked_at,
    ),
  })));
  return <SpeedTestArena
    initialGame={daily === "1" || game === "typing" ? "typing" : game === "audio" ? "audio" : game === "flash" ? "flash" : game === "card" ? "card" : "arena"}
    typingDailyMode={daily === "1"}
    audioLessons={audioLessons}
  />;
}
