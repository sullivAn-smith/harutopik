import { apiSuccess } from "@/lib/api/responses";
import { getPublishedCourses } from "@/lib/data/published-catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  const courses = await getPublishedCourses();
  return apiSuccess(
    {
      catalogVersion: "2026-07-24",
      courses: courses.map((course) => ({
        ...course,
        lessons: course.lessons.filter(
          (lesson) => lesson.status === "published",
        ),
      })),
    },
    { cacheControl: "no-store" },
  );
}
