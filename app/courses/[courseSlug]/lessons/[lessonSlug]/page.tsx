import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import {
  getLessonParams,
} from "@/content/catalog";
import { LessonExperience } from "@/features/lesson/lesson-experience";
import { getTopikBookLevelLabel } from "@/lib/catalog/course-shelf";
import { getPublishedLessonRouteData } from "@/lib/data/published-catalog";
import { getCurrentActor } from "@/lib/auth/authorize";

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
  const data = await getPublishedLessonRouteData(courseSlug, lessonSlug);
  if (!data) return {};

  return {
    title: `${data.lesson.title.vi} — ${data.courseTitle}`,
    description: data.lesson.summary,
  };
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { courseSlug, lessonSlug } = await params;
  const lessonData = getPublishedLessonRouteData(courseSlug, lessonSlug);
  const actor = await getCurrentActor();
  if (!actor) {
    const lessonUrl = `/courses/${encodeURIComponent(courseSlug)}/lessons/${encodeURIComponent(lessonSlug)}`;
    redirect(`/dang-nhap?next=${encodeURIComponent(lessonUrl)}`);
  }
  const data = await lessonData;
  if (!data) notFound();
  return (
    <LessonExperience
      lesson={data.lesson}
      backHref="/thu-vien/1"
      backLabel="Danh sách quyển"
      statusLabel={getTopikBookLevelLabel(courseSlug)}
      speedTestHref={`/courses/${encodeURIComponent(courseSlug)}/lessons/${encodeURIComponent(lessonSlug)}/speed-test`}
      courseSlug={courseSlug}
      lessonSlug={lessonSlug}
    />
  );
}
