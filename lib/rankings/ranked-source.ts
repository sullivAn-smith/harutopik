import "server-only";

import { getPublishedCourseShells } from "@/lib/data/published-catalog";

export async function getRankedSpeedLesson() {
  const courses = await getPublishedCourseShells();
  for (const course of courses) {
    const lesson = [...course.lessons].sort(
      (left, right) => left.order - right.order,
    )[0];
    if (lesson) {
      return {
        courseSlug: course.slug,
        lessonSlug: lesson.slug,
        lessonId: lesson.id,
        lessonName: `Bài ${lesson.order}: ${lesson.title.vi}`,
      };
    }
  }
  return null;
}

export async function isRankedSpeedLesson(
  courseSlug: string,
  lessonSlug: string,
) {
  const source = await getRankedSpeedLesson();
  return Boolean(
    source &&
      source.courseSlug === courseSlug &&
      source.lessonSlug === lessonSlug,
  );
}
