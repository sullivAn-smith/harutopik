import { topikOneCourse } from "@/content/courses/topik-1/course";
import { lessonOne } from "@/content/courses/topik-1/lessons/lesson-01";
import type { Lesson } from "@/content/schema";

export type CourseModule = {
  id: string;
  slug: string;
  courseId: string;
  title: {
    ko: string;
    vi: string;
  };
  order: number;
  lessons: readonly Lesson[];
};

export type Course = {
  id: string;
  slug: string;
  title: {
    ko: string;
    vi: string;
  };
  summary: string;
  level: string;
  lessonCount: number;
  status: string;
  lessons: readonly Lesson[];
  modules?: readonly CourseModule[];
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
