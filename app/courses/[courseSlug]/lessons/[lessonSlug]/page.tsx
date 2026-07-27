import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getLessonParams,
} from "@/content/catalog";
import { LessonExperience } from "@/features/lesson/lesson-experience";
import { getPublishedCourses } from "@/lib/data/published-catalog";

type LessonPageProps = {
  params: Promise<{
    courseSlug: string;
    lessonSlug: string;
  }>;
};

export const dynamicParams = true;
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return getLessonParams();
}

export async function generateMetadata({
  params,
}: LessonPageProps): Promise<Metadata> {
  const { courseSlug, lessonSlug } = await params;
  const courses = await getPublishedCourses();
  const course = courses.find((item) => item.slug === courseSlug);
  const lesson = course?.lessons.find((item) => item.slug === lessonSlug);
  if (!course || !lesson) return {};

  return {
    title: `${lesson.title.vi} — ${course.title.vi}`,
    description: lesson.summary,
  };
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { courseSlug, lessonSlug } = await params;
  const courses = await getPublishedCourses();
  const course = courses.find((item) => item.slug === courseSlug);
  const lesson = course?.lessons.find((item) => item.slug === lessonSlug);
  if (!lesson) notFound();

  return <LessonExperience lesson={lesson} />;
}
