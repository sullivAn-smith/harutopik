import { HomeClient, type CourseSummary } from "@/features/home/home-client";
import { getPublishedCourses } from "@/lib/data/published-catalog";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const courses = await getPublishedCourses();
  const initialCourses: CourseSummary[] = courses.map((course) => ({
    id: course.id,
    slug: course.slug,
    title: course.title,
    summary: course.summary,
    lessonCount: course.lessons.length,
    lessons: course.lessons.map((lesson) => ({ id: lesson.id })),
  }));

  return <HomeClient initialCourses={initialCourses} />;
}
