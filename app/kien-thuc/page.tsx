import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedReferenceSets } from "@/lib/data/reference-library";

export const metadata: Metadata = { title: "Kiến thức nền tảng" };
export const dynamic = "force-dynamic";

export default async function FoundationLibraryPage() {
  const sets = await getPublishedReferenceSets();
  const cards = [
    {
      id: "hangul",
      href: "/hangul",
      icon: "한",
      titleVi: "Bảng chữ cái",
      titleKo: "한글",
      description: "Học nguyên âm, phụ âm và cách ghép chữ.",
      tone: "bg-gradient-to-br from-blue-50 to-cyan-100",
      iconTone: "text-blue-700",
    },
    ...sets.map((set, index) => ({
      id: set.id,
      href: `/kien-thuc/${set.slug}`,
      icon: set.id === "native-korean-numbers" ? "하나" : "일",
      titleVi: set.titleVi,
      titleKo: set.titleKo,
      description: set.description,
      tone:
        index % 2 === 0
          ? "bg-gradient-to-br from-sky-50 to-cyan-100"
          : "bg-gradient-to-br from-violet-50 to-indigo-100",
      iconTone: index % 2 === 0 ? "text-sky-700" : "text-violet-700",
    })),
  ];

  return (
    <main className="elegant-blue min-h-screen px-5 py-8 text-[#10243e] sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="inline-flex rounded-2xl border border-white/80 bg-white/75 px-4 py-2.5 font-black text-[#087eba] shadow-sm">
          ← Trang chủ
        </Link>
        <header className="mt-6 rounded-[2rem] border border-white/70 bg-white/70 p-7 shadow-[0_18px_40px_rgba(16,36,62,0.12)] backdrop-blur sm:p-10">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#087eba]">Tra cứu nhanh</p>
          <h1 className="mt-2 text-4xl font-black sm:text-5xl">Kiến thức nền tảng</h1>
          <p className="mt-3 max-w-2xl text-lg font-semibold leading-8 text-[#10243e]/65">
            Những bảng quan trọng để bạn xem lại bất cứ lúc nào.
          </p>
        </header>

        <section className="mt-7 grid gap-5 md:grid-cols-3">
            {cards.map((card) => (
              <Link
                key={card.id}
                href={card.href}
                className={`group relative overflow-hidden rounded-[2rem] border border-white/80 p-6 shadow-[0_16px_34px_rgba(16,36,62,0.12)] transition hover:-translate-y-1 hover:shadow-[0_22px_42px_rgba(16,36,62,0.18)] ${card.tone}`}
              >
                <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/35" />
                <span lang="ko" className={`relative grid h-16 min-w-16 w-fit place-items-center rounded-2xl bg-white px-3 text-2xl font-black shadow-sm ${card.iconTone}`}>
                  {card.icon}
                </span>
                <h2 className="relative mt-5 text-2xl font-black">{card.titleVi}</h2>
                <p lang="ko" className="relative mt-1 font-bold text-[#245d93]">{card.titleKo}</p>
                <p className="relative mt-3 min-h-14 font-semibold leading-7 text-[#10243e]/65">{card.description}</p>
                <span className="relative mt-6 inline-flex rounded-xl bg-white px-4 py-2.5 font-black text-[#087eba] shadow-sm transition group-hover:translate-x-1">
                  Mở bảng →
                </span>
              </Link>
            ))}
          </section>
        {!sets.length && (
          <section className="mt-7 rounded-3xl border border-amber-200 bg-amber-50 p-6 font-semibold text-amber-900">
            Hai bảng số chưa tải được. Hãy chạy migration Supabase mới rồi tải lại trang.
          </section>
        )}
      </div>
    </main>
  );
}
