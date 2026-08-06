import Link from "next/link";
import { coursePath } from "@/content/catalog";
import {
  buildTopikShelf,
  getAdditionalPublishedCourses,
} from "@/lib/catalog/course-shelf";
import { getPublishedCourses } from "@/lib/data/published-catalog";

export const dynamic = "force-dynamic";

export default async function KoreanLibraryPage() {
  const courses = await getPublishedCourses();
  const topikShelf = buildTopikShelf(courses);
  const additionalCourses = getAdditionalPublishedCourses(courses);
  const unlockedCount = topikShelf.filter((item) => item.course).length;

  return (
    <main className="elegant-blue min-h-screen text-[#101820]">
      <div className="mx-auto max-w-6xl px-6 py-10 md:px-8">
        <Link href="/" className="inline-flex rounded-full border border-white/70 bg-white/60 px-4 py-2 font-black shadow-sm">← Trang chủ</Link>
        <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[#087eba]">Kho học liệu</p>
            <h1 className="mt-2 text-4xl font-black">Thư viện học</h1>
            <p className="mt-2 text-lg font-semibold text-[#10243e]/70">Chọn khóa học đã phát hành để bắt đầu.</p>
          </div>
          <span className="rounded-full bg-white/70 px-4 py-2 text-sm font-black text-[#245d93] shadow-sm">{unlockedCount}/6 giáo trình TOPIK đang mở</span>
        </div>

        <section className="mt-8">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {topikShelf.map((item) => {
              const cover = (
                <div className="relative aspect-[3/4] overflow-hidden rounded-3xl border-2 border-white/70 bg-gradient-to-br from-[#168fd0] via-[#087eba] to-[#123f72] p-4 shadow-[0_14px_30px_rgba(16,36,62,0.18)]">
                  <div className="absolute inset-y-0 left-0 w-3 bg-[#10243e]/20" />
                  <div className="absolute inset-x-[13%] top-[12%] aspect-square rounded-full border-8 border-white/15 bg-white/90 shadow-inner" />
                  <div className="absolute inset-x-[13%] top-[12%] flex aspect-square flex-col items-center justify-center text-center">
                    <strong className="text-[clamp(1.1rem,2vw,1.8rem)] font-black text-[#10243e]">TOPIK</strong>
                    <span className="mt-1 text-[clamp(.55rem,.85vw,.72rem)] font-black text-[#245d93]">Nền tảng cho người Việt</span>
                  </div>
                  <span className="absolute bottom-[12%] right-[12%] text-5xl font-black italic text-white drop-shadow-lg">{item.level}</span>
                </div>
              );

              return item.course ? (
                <Link key={item.id} href={coursePath(item.course)} className="group relative transition hover:-translate-y-1" aria-label={`Học ${item.course.title.vi}`}>
                  {cover}
                  <span className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-3 py-1.5 text-xs font-black text-[#087eba] shadow-lg">HỌC NGAY</span>
                </Link>
              ) : (
                <div key={item.id} className="relative cursor-not-allowed opacity-45 grayscale" aria-label={`${item.label} chưa phát hành`}>
                  {cover}
                  <span className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#10243e]/85 px-3 py-1.5 text-xs font-black text-white shadow-lg">Sắp ra mắt</span>
                </div>
              );
            })}
          </div>
        </section>

        {additionalCourses.length > 0 && (
          <section className="mt-12">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.16em] text-[#087eba]">Đã phát hành</p>
              <h2 className="mt-1 text-3xl font-black">Khóa học khác</h2>
            </div>
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {additionalCourses.map((course) => (
                <Link key={course.id} href={coursePath(course)} className="group rounded-3xl border border-white/80 bg-white/75 p-6 shadow-[0_14px_30px_rgba(16,36,62,0.12)] backdrop-blur transition hover:-translate-y-1 hover:bg-white">
                  <span className="rounded-full bg-[#e7f4ff] px-3 py-1 text-xs font-black text-[#087eba]">{course.lessons.length} bài đã mở</span>
                  <h3 className="mt-4 text-2xl font-black">{course.title.vi}</h3>
                  <p lang="ko" className="font-korean mt-1 font-bold text-[#245d93]">{course.title.ko}</p>
                  <span className="mt-5 inline-flex font-black text-[#087eba] transition group-hover:translate-x-1">Mở khóa học →</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
