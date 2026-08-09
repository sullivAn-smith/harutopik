import { HomeClient, type CourseSummary } from "@/features/home/home-client";
import { getPublishedCourseShells } from "@/lib/data/published-catalog";
import { getHomeStreakData } from "@/lib/data/streaks";
import { getHomeNotificationSummary } from "@/lib/data/notifications";
import { getCurrentUser } from "@/lib/auth/authorize";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [courses, user] = await Promise.all([
    getPublishedCourseShells(),
    getCurrentUser(),
  ]);
  const [streakData, notificationSummary] = await Promise.all([
    getHomeStreakData(user?.id ?? null),
    getHomeNotificationSummary(user?.id ?? null),
  ]);
  const initialCourses: CourseSummary[] = courses.map((course) => ({
    id: course.id,
    slug: course.slug,
    title: course.title,
    summary: course.summary,
    lessonCount: course.lessons.length,
    lessons: course.lessons.map((lesson) => ({
      id: lesson.id,
      slug: lesson.slug,
      order: lesson.order,
      title: lesson.title,
    })),
  }));

  return (
    <HomeClient
      initialCourses={initialCourses}
      initialUser={user}
      initialStreakData={streakData}
      initialNotificationSummary={notificationSummary}
    />
  );
}
