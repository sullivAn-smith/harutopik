import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SpeedTestArena } from "@/features/speed-test/speed-test-arena";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentUser } from "@/lib/auth/authorize";
import { getPublishedCourseShells } from "@/lib/data/published-catalog";
import { getRankedSpeedLesson } from "@/lib/rankings/ranked-source";
import { rankedSpeedGameFromQuery } from "@/lib/rankings/speed-ranking";

export const metadata: Metadata = { title: "Speed Test Arena" };
export const dynamic = "force-dynamic";

export default async function SpeedTestPage({ searchParams }: { searchParams: Promise<{ daily?: string; game?: string; ranked?: string }> }) {
  if (!isSupabaseConfigured()) redirect("/dang-nhap?next=%2Fspeed-test");
  const user = await getCurrentUser();
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
  const courses = await getPublishedCourseShells();
  const audioLessons = courses.flatMap((course) => course.lessons.map((lesson) => ({
    id: lesson.id,
    courseSlug: course.slug,
    lessonSlug: lesson.slug,
    name: `Bài ${lesson.order}: ${lesson.title.vi}`,
    completionPercent: 0,
    speedTestUnlocked: false,
  })));
  return <SpeedTestArena
    initialGame={daily === "1" || game === "typing" ? "typing" : game === "audio" ? "audio" : game === "flash" ? "flash" : game === "card" ? "card" : "arena"}
    typingDailyMode={daily === "1"}
    audioLessons={audioLessons}
    hydrateAudioProgress
  />;
}
