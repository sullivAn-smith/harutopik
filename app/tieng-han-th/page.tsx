import Link from "next/link";

const books = [
  [1, "TOPIK 1", "Sơ cấp 1 · Giới thiệu"],
  [2, "TOPIK 2", "Sơ cấp 2"],
  [3, "TOPIK 3", "Trung cấp 1"],
  [4, "TOPIK 4", "Trung cấp 2"],
  [5, "TOPIK 5", "Nâng cao 1"],
  [6, "TOPIK 6", "Nâng cao 2"],
] as const;

export default function KoreanBooks() {
  return <main className="elegant-blue min-h-screen text-[#101820]"><div className="mx-auto max-w-5xl px-6 py-10 md:px-8"><Link href="/" className="inline-flex rounded-full border border-white/70 bg-white/60 px-4 py-2 font-black shadow-sm">← Trang chủ</Link><h1 className="mt-8 text-4xl font-black">Tiếng Hàn TH</h1><p className="mt-2 text-lg font-semibold text-[#10243e]/70">Chọn sách bạn muốn học</p><div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{books.map(([number, title, subtitle]) => <Link key={number} href={number === 1 ? "/courses/topik-1" : `/tieng-han-th/${number}`} className="rounded-3xl border-2 border-[#10243e] bg-white p-6 shadow-[5px_6px_0_#10243e] transition hover:-translate-y-1 hover:bg-blue-50"><span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500 text-xl font-black text-white">{number}</span><h2 className="mt-5 text-2xl font-black">{title}</h2><p className="mt-1 font-semibold text-[#10243e]/65">{subtitle}</p><span className="mt-6 inline-block font-black text-blue-700">Mở sách →</span></Link>)}</div></div></main>;
}
