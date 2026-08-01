import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ReferenceAudioButton } from "@/features/reference-library/reference-audio-button";
import { getPublishedReferenceSet } from "@/lib/data/reference-library";

export const dynamic = "force-dynamic";

const groupTitles: Record<string, string> = {
  basic: "Số cơ bản",
  tens: "Hàng chục",
  units: "Đơn vị lớn",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const set = await getPublishedReferenceSet(slug);
  return { title: set?.titleVi ?? "Kiến thức nền tảng" };
}

export default async function ReferenceSetPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const set = await getPublishedReferenceSet(slug);
  if (!set) notFound();
  const groups = [...new Set(set.items.map((item) => item.groupKey))];
  const native = set.id === "native-korean-numbers";

  return (
    <main className="elegant-blue min-h-screen px-5 py-8 text-[#10243e] sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/kien-thuc" className="rounded-2xl border border-white/80 bg-white/75 px-4 py-2.5 font-black text-[#087eba] shadow-sm">
            ← Kiến thức nền tảng
          </Link>
          <div className="flex rounded-2xl border border-white/80 bg-white/65 p-1.5 shadow-sm">
            <Link href="/kien-thuc/so-thuan-han" className={`rounded-xl px-4 py-2 font-black ${native ? "bg-[#087eba] text-white" : "text-[#10243e]/60"}`}>Thuần Hàn</Link>
            <Link href="/kien-thuc/so-han-han" className={`rounded-xl px-4 py-2 font-black ${!native ? "bg-[#087eba] text-white" : "text-[#10243e]/60"}`}>Hán Hàn</Link>
          </div>
        </div>

        <header className={`mt-6 overflow-hidden rounded-[2rem] border border-white/70 p-7 shadow-[0_18px_40px_rgba(16,36,62,0.14)] sm:p-10 ${native ? "bg-gradient-to-br from-sky-50 to-cyan-100" : "bg-gradient-to-br from-violet-50 to-indigo-100"}`}>
          <p lang="ko" className="text-xl font-black text-[#087eba]">{set.titleKo}</p>
          <h1 className="mt-2 text-4xl font-black sm:text-5xl">{set.titleVi}</h1>
          <p className="mt-3 max-w-2xl text-lg font-semibold leading-8 text-[#10243e]/65">{set.description}</p>
        </header>

        {groups.map((group) => {
          const items = set.items.filter((item) => item.groupKey === group);
          return (
            <section key={group} className="mt-7 rounded-[2rem] border border-white/70 bg-white/68 p-5 shadow-[0_14px_32px_rgba(16,36,62,0.1)] backdrop-blur sm:p-7">
              <h2 className="text-2xl font-black">{groupTitles[group] ?? "Mở rộng"}</h2>
              <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
                {items.map((item) => (
                  <article key={item.id} className="rounded-3xl border border-sky-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300">
                    <div className="flex items-start justify-between gap-2">
                      <span className="grid h-11 min-w-11 place-items-center rounded-2xl bg-[#e7f4ff] px-2 text-lg font-black text-[#087eba]">{item.valueLabel}</span>
                      <ReferenceAudioButton audioUrl={item.audioUrl} text={item.korean} />
                    </div>
                    <p lang="ko" className="mt-4 text-3xl font-black">{item.korean}</p>
                    <p className="mt-1 font-bold text-[#245d93]">{item.romanization}</p>
                    {item.shortForm && <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-800">Khi đếm: {item.shortForm}</p>}
                    {item.noteVi && <p className="mt-3 text-xs font-semibold leading-5 text-[#10243e]/55">{item.noteVi}</p>}
                  </article>
                ))}
              </div>
            </section>
          );
        })}

        <section className="mt-7 rounded-[2rem] bg-[#10243e] p-6 text-white shadow-xl sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">Dùng khi nào?</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {(native
              ? ["Đếm đồ vật", "Nói tuổi", "Nói giờ", "Đếm người"]
              : ["Ngày tháng", "Tiền", "Số điện thoại", "Nói phút"]
            ).map((usage) => (
              <p key={usage} className="rounded-2xl bg-white/10 px-4 py-3 font-bold">✓ {usage}</p>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
