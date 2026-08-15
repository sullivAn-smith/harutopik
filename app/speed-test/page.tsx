import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SpeedTestArena } from "@/features/speed-test/speed-test-arena";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { getPublishedCourseShells } from "@/lib/data/published-catalog";

export const metadata: Metadata = { title: "Speed Test Arena" };
export const dynamic = "force-dynamic";

export default async function SpeedTestPage({ searchParams }: { searchParams: Promise<{ daily?: string; game?: string }> }) {
  if (!isSupabaseConfigured()) redirect("/dang-nhap?next=%2Fspeed-test");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/dang-nhap?next=%2Fspeed-test");
  const { daily, game } = await searchParams;
  const courses = await getPublishedCourseShells();
  const audioLessons = courses.flatMap((course) => course.lessons.map((lesson) => ({
    id: lesson.id,
    courseSlug: course.slug,
    lessonSlug: lesson.slug,
    name: `Bài ${lesson.order}: ${lesson.title.vi}`,
  })));
  return <SpeedTestArena
    initialGame={daily === "1" || game === "typing" ? "typing" : game === "audio" ? "audio" : game === "flash" ? "flash" : game === "card" ? "card" : "arena"}
    typingDailyMode={daily === "1"}
    audioLessons={audioLessons}
  />;
}
