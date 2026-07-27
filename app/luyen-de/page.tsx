import Link from "next/link";

export default function PracticeTests() {
  return (
    <main className="elegant-blue min-h-screen text-[#101820]">
      <div className="mx-auto max-w-4xl px-6 py-10 md:px-8">
        <Link href="/" className="inline-flex rounded-full border border-white/70 bg-white/60 px-4 py-2 font-black shadow-sm">← Trang chủ</Link>
        <section className="mt-8 rounded-3xl border-2 border-[#10243e] bg-white p-8 shadow-[6px_7px_0_#10243e] md:p-10">
          <p className="inline-flex rounded-xl border-2 border-blue-700 bg-blue-600 px-4 py-2 text-xl font-black text-white shadow-[3px_3px_0_#10243e]">Luyện đề</p>
          <h1 className="mt-5 text-4xl font-black text-[#10243e]">Ôn tập và kiểm tra</h1>
          <p className="mt-3 text-lg leading-8 text-[#10243e]/70">Luyện tập tổng hợp từ vựng và ngữ pháp tiếng Hàn theo từng bài học.</p>
          <div className="mt-8 rounded-2xl border-2 border-blue-200 bg-blue-50 p-6 text-lg font-bold text-blue-900">Các bộ đề đang được chuẩn bị. Bạn có thể tiếp tục học trong mục Tiếng Hàn TH.</div>
          <Link href="/courses/topik-1" className="mt-6 inline-flex rounded-xl bg-[#10243e] px-5 py-3 font-black text-white">Đến danh sách bài học →</Link>
        </section>
      </div>
    </main>
  );
}
