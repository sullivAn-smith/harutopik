import Link from "next/link";
import { notFound } from "next/navigation";

import {
  CurriculumSeriesLibrary,
  type CurriculumBook,
} from "@/features/library/curriculum-series-library";
import { getCurrentUser } from "@/lib/auth/authorize";
import { buildTopikShelf } from "@/lib/catalog/course-shelf";
import {
  curriculumSeriesDefinitions,
  getCurriculumSeries,
} from "@/lib/catalog/curriculum-series";
import { getPublishedCourseShells } from "@/lib/data/published-catalog";

type CurriculumSeriesPageProps = {
  params: Promise<{ series: string }>;
};

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return curriculumSeriesDefinitions.map((series) => ({ series: series.id }));
}

export default async function CurriculumSeriesPage({ params }: CurriculumSeriesPageProps) {
  const { series: seriesId } = await params;
  const series = getCurriculumSeries(seriesId);
  if (!series) notFound();

  const [courses, user] = await Promise.all([
    getPublishedCourseShells(),
    getCurrentUser(),
  ]);

  const books: CurriculumBook[] = series.id === "1"
    ? buildTopikShelf(courses).map((item) => ({
        number: item.level,
        status: item.course ? "published" : "locked",
        courseSlug: item.course?.slug ?? null,
        lessons: item.course?.lessons.map((lesson) => ({
          id: lesson.id,
          slug: lesson.slug,
          order: lesson.order,
          title: lesson.title.vi,
        })) ?? [],
      }))
    : Array.from({ length: series.bookCount }, (_, index) => ({
        number: index + 1,
        status: "locked" as const,
        courseSlug: null,
        lessons: [],
      }));

  const publishedCount = books.filter((book) => book.status === "published").length;

  return (
    <main className="elegant-blue min-h-screen text-[#10243e]">
      <div className="mx-auto max-w-5xl px-5 py-7 md:px-8 md:py-9">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-white/75 bg-white/65 px-4 py-2.5 text-sm font-black text-[#344b67] shadow-[0_10px_26px_rgba(16,36,62,.1)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white"
        >
          <span aria-hidden="true">←</span>
          <span>Trang chủ</span>
        </Link>

        <header className="relative mt-6 overflow-hidden rounded-[2.25rem] border border-white/70 bg-gradient-to-br from-[#103f72] via-[#087eba] to-[#20a9d4] px-6 py-7 text-white shadow-[0_24px_58px_rgba(6,88,145,.28)] md:px-9 md:py-8">
          <span aria-hidden="true" className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-white/12" />
          <span aria-hidden="true" className="absolute bottom-[-7rem] right-[18%] h-52 w-52 rounded-full border-[26px] border-white/8" />
          <div className="relative grid items-end gap-6 md:grid-cols-[1fr_auto]">
            <div>
              <p className="text-xs font-black uppercase tracking-[.2em] text-cyan-100">Thư viện học</p>
              <h1 className="mt-2 text-4xl font-black md:text-5xl">Bộ {series.id}</h1>
              <p className="mt-3 max-w-xl font-semibold text-white/78">
                Chọn một quyển để mở danh sách bài học và tiếp tục tiến độ của bạn.
              </p>
            </div>
            <div className="min-w-48 rounded-[1.5rem] border border-white/20 bg-white/12 p-4 backdrop-blur">
              <div className="flex items-end justify-between gap-4">
                <strong className="text-2xl font-black">{publishedCount}/{series.bookCount}</strong>
                <span className="text-xs font-black uppercase tracking-[.12em] text-cyan-100">Quyển đã mở</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#10243e]/35">
                <div className="h-full rounded-full bg-white" style={{ width: `${(publishedCount / series.bookCount) * 100}%` }} />
              </div>
            </div>
          </div>
        </header>

        <section className="mt-6 pb-12" aria-label={`Danh sách quyển của bộ ${series.id}`}>
          <CurriculumSeriesLibrary series={series} books={books} signedIn={Boolean(user)} />
        </section>
      </div>
    </main>
  );
}
