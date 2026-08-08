import { HomeClient, type CourseSummary } from "@/features/home/home-client";
import { getPublishedCourses } from "@/lib/data/published-catalog";
import { getHomeStreakData } from "@/lib/data/streaks";
import { getHomeNotificationSummary } from "@/lib/data/notifications";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [courses, streakData, notificationSummary] = await Promise.all([
    getPublishedCourses(),
    getHomeStreakData(),
    getHomeNotificationSummary(),
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
      initialStreakData={streakData}
      initialNotificationSummary={notificationSummary}
    />
  );
}
