import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCourseParams,
  lessonPath,
} from "@/content/catalog";
import { getPublishedCourses } from "@/lib/data/published-catalog";

type CoursePageProps = {
  params: Promise<{ courseSlug: string }>;
};

export const dynamicParams = true;
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return getCourseParams();
}

export async function generateMetadata({
  params,
}: CoursePageProps): Promise<Metadata> {
  const { courseSlug } = await params;
  const courses = await getPublishedCourses();
  const course = courses.find((item) => item.slug === courseSlug);
  if (!course) return {};

  return {
    title: course.title.vi,
    description: course.summary,
  };
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { courseSlug } = await params;
  const courses = await getPublishedCourses();
  const course = courses.find((item) => item.slug === courseSlug);
  if (!course) notFound();

  return (
    <main className="elegant-blue min-h-screen text-[#10243e]">
      <div className="mx-auto max-w-6xl px-5 py-6 md:px-8 md:py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/55 px-4 py-2.5 text-sm font-black shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/80"
        >
          ← Trang chủ
        </Link>

        <section className="mt-6 rounded-[2rem] border border-white/70 bg-white/45 p-6 shadow-[0_20px_50px_rgba(16,36,62,0.12)] backdrop-blur-xl md:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#087eba] px-3.5 py-1.5 text-sm font-black text-white shadow-sm">
              TOPIK 1
            </span>
            <span className="rounded-full bg-white/70 px-3.5 py-1.5 text-sm font-bold text-[#52637a]">
              Sơ cấp · {course.lessonCount} bài
            </span>
          </div>
          <h1 className="page-heading mt-4">{course.title.vi}</h1>
          <p
            lang="ko"
            className="font-korean mt-2 text-xl font-bold text-[#344b67]"
          >
            {course.title.ko}
          </p>
          <p className="body-lead mt-4 max-w-3xl">{course.summary}</p>
        </section>

        <section className="mt-8 pb-14">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="inline-flex rounded-lg bg-[#087eba] px-3 py-1.5 text-sm font-black uppercase tracking-[0.14em] text-white shadow-[3px_3px_0_#10243e]">
                Lộ trình học
              </p>
              <h2 className="section-heading mt-3">Bài học</h2>
            </div>
            <span className="rounded-full bg-white/60 px-3 py-1.5 text-sm font-bold text-[#52637a] shadow-sm">
              {course.lessons.length}/{course.lessonCount} bài đã xuất bản
            </span>
          </div>

          <div className="space-y-3">
            {course.lessons.map((lesson) => (
              <Link
                key={lesson.id}
                href={lessonPath(course, lesson)}
                className="flex items-center gap-4 rounded-2xl border border-white/80 bg-white/85 px-5 py-4 shadow-[0_12px_28px_rgba(16,36,62,0.12)] backdrop-blur transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_18px_34px_rgba(16,36,62,0.16)]"
              >
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-[#087eba]/30 bg-blue-50 text-xl font-black text-[#087eba]">
                  {lesson.order}
                </span>
                <span className="min-w-0 flex-1">
                  <strong
                    lang="ko"
                    className="font-korean block text-xl font-black"
                  >
                    {lesson.title.ko}
                  </strong>
                  <span className="mt-1 block text-base font-semibold text-[#52637a]">
                    {lesson.title.vi} · {lesson.vocabulary.length} từ
                  </span>
                </span>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#10243e]/5 text-2xl text-[#52637a]">
                  ›
                </span>
              </Link>
            ))}

            {Array.from({
              length: Math.max(0, course.lessonCount - course.lessons.length),
            }).map((_, index) => {
              const lessonNumber = course.lessons.length + index + 1;
              return (
                <div
                  key={lessonNumber}
                  className="flex items-center gap-4 rounded-2xl border border-white/60 bg-white/40 px-5 py-4 opacity-75 shadow-sm backdrop-blur-sm"
                >
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-white/70 bg-white/60 text-xl font-black text-[#52637a]">
                    {lessonNumber}
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block text-lg font-black">
                      Bài {lessonNumber}
                    </strong>
                    <span className="mt-1 block text-sm font-semibold text-[#52637a]">
                      Nội dung đang được biên soạn
                    </span>
                  </span>
                  <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold text-[#52637a]">
                    Sắp ra mắt
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
