import Link from "next/link";

export default function CourseNotFound() {
  return (
    <main className="elegant-blue flex min-h-screen items-center justify-center px-5 text-[#10243e]">
      <section className="max-w-xl rounded-3xl border-2 border-[#10243e] bg-white p-8 text-center shadow-[6px_7px_0_#10243e]">
        <p className="text-sm font-black uppercase tracking-widest text-[#087eba]">
          404 · Không tìm thấy
        </p>
        <h1 className="mt-3 text-3xl font-black">
          Bài học này chưa tồn tại
        </h1>
        <p className="mt-3 leading-7 text-[#52637a]">
          Nội dung có thể chưa được xuất bản hoặc đường dẫn không còn hợp lệ.
        </p>
        <Link
          href="/courses/topik-1"
          className="mt-6 inline-flex rounded-xl bg-[#10243e] px-5 py-3 font-black text-white"
        >
          Về lộ trình TOPIK 1
        </Link>
      </section>
    </main>
  );
}
