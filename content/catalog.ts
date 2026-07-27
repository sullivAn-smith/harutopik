import { topikOneCourse } from "@/content/courses/topik-1/course";
import { lessonOne } from "@/content/courses/topik-1/lessons/lesson-01";
import type { Lesson } from "@/content/schema";

export type Course = typeof topikOneCourse & {
  lessons: readonly Lesson[];
};

export const courses: readonly Course[] = [
  {
    ...topikOneCourse,
    lessons: [lessonOne],
  },
];

export function getCourseBySlug(courseSlug: string) {
  return courses.find((course) => course.slug === courseSlug);
}

export function getLessonBySlug(courseSlug: string, lessonSlug: string) {
  return getCourseBySlug(courseSlug)?.lessons.find(
    (lesson) => lesson.slug === lessonSlug,
  );
}

export function getCourseParams() {
  return courses.map((course) => ({
    courseSlug: course.slug,
  }));
}

export function getLessonParams() {
  return courses.flatMap((course) =>
    course.lessons.map((lesson) => ({
      courseSlug: course.slug,
      lessonSlug: lesson.slug,
    })),
  );
}

export function coursePath(course: Pick<Course, "slug">) {
  return `/courses/${course.slug}`;
}

export function lessonPath(
  course: Pick<Course, "slug">,
  lesson: Pick<Lesson, "slug">,
) {
  return `${coursePath(course)}/lessons/${lesson.slug}`;
}
