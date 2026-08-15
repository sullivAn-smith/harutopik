import Image from "next/image";
import Link from "next/link";

import type { CurriculumSeriesDefinition } from "@/lib/catalog/curriculum-series";

const coverCopy = {
  "1": { title: "TOPIK", subtitle: "Nền tảng cho\nngười Việt" },
  "2": { title: "서울 한국어", subtitle: "(SEOUL KOREAN)" },
  "3": { title: "세종 한국어", subtitle: "(SEJONG KOREAN)" },
} as const;

const coverTheme = {
  "1": "from-[#109fea] via-[#087dcc] to-[#07509a]",
  "2": "from-[#35bc64] via-[#11a346] to-[#087a35]",
  "3": "from-[#ffbd20] via-[#f5a607] to-[#dc8500]",
} as const;

export function CurriculumSeriesCover({ series, priority = false, compact = false }: {
  series: CurriculumSeriesDefinition;
  priority?: boolean;
  compact?: boolean;
}) {
  const copy = coverCopy[series.id];

  return (
    <Link
      href={series.href}
      aria-label={`Mở bộ ${series.id}`}
      data-theme={series.theme}
      data-cover-variant={`reference-${series.id}`}
      className={`group relative isolate block overflow-hidden border border-white/65 bg-gradient-to-br ${coverTheme[series.id]} text-white shadow-[0_14px_30px_rgba(7,63,114,.24),inset_0_1px_0_rgba(255,255,255,.4)] ring-1 ring-[#10243e]/20 transition duration-300 ease-out hover:-translate-y-1.5 hover:scale-[1.012] hover:shadow-[0_8px_0_rgba(5,58,101,.3),0_24px_44px_rgba(8,69,117,.35)] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#46c7ff] motion-reduce:transform-none ${compact ? "aspect-[1.42/1] rounded-[1.25rem]" : "aspect-[3/4] rounded-[1.2rem]"}`}
    >
      <span aria-hidden="true" className="absolute inset-y-0 left-0 z-20 w-[5.5%] border-r border-white/25 bg-gradient-to-r from-[#10243e]/38 via-[#10243e]/14 to-white/10 shadow-[5px_0_10px_rgba(16,36,62,.18)]" />
      <span aria-hidden="true" className="absolute inset-y-[3%] left-[5.5%] z-20 w-px bg-white/30" />
      <span aria-hidden="true" className="absolute -right-[16%] -top-[45%] aspect-square w-[72%] rounded-full bg-white/10" />

      {series.id === "2" && series.coverAsset && (
        <span className={`absolute overflow-hidden bg-[conic-gradient(from_45deg_at_50%_50%,#f4cd4f_0_25%,#087a35_0_50%,#73c8af_0_75%,#f7e7ae_0)] [background-size:50%_25%] shadow-[-8px_8px_18px_rgba(4,75,35,.18)] ${compact ? "inset-y-[5%] right-[4%] w-[43%]" : "bottom-[7%] right-[7%] h-[48%] w-[72%]"}`}>
          <Image src={series.coverAsset} alt="" fill priority={priority} sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 90vw" className="-translate-x-[20%] scale-[2.95] object-cover object-center mix-blend-luminosity contrast-[1.08] saturate-[.75] transition duration-500 group-hover:-translate-x-[20%] group-hover:scale-[3.05]" />
        </span>
      )}

      {series.id === "3" && series.coverAsset && (
        <span className={`absolute overflow-hidden bg-white shadow-[-8px_8px_18px_rgba(125,71,0,.15)] ${compact ? "inset-y-[5%] right-[4%] w-[43%]" : "bottom-[7%] right-[7%] h-[48%] w-[72%]"}`}>
          <Image src={series.coverAsset} alt="" fill priority={priority} sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 90vw" className="object-cover transition duration-500 group-hover:scale-105" />
        </span>
      )}

      <span className={`absolute left-[11%] top-[8%] z-30 flex flex-col items-start text-left drop-shadow-[0_3px_7px_rgba(16,36,62,.2)] ${compact ? "gap-0" : "gap-1"}`}>
        <span className={`font-black uppercase tracking-[.17em] text-white/95 ${compact ? "text-[clamp(.55rem,1vw,.8rem)]" : "text-[clamp(.65rem,1.4vw,.95rem)]"}`}>Bộ sách</span>
        <strong className={`mt-1 font-black leading-none text-white ${compact ? "text-[clamp(2.4rem,5vw,4.1rem)]" : "text-[clamp(3rem,7vw,5.2rem)]"}`}>{series.id}</strong>
      </span>

      {series.id === "1" ? (
        <span className={`absolute z-20 grid aspect-square place-items-center rounded-full bg-[#f8fbff] text-center text-[#071744] shadow-[0_0_0_7px_rgba(255,255,255,.18),0_12px_28px_rgba(4,37,79,.28)] ${compact ? "bottom-[12%] right-[8%] w-[43%]" : "bottom-[12%] right-[9%] w-[62%]"}`}>
          <span>
            <strong className={`block font-black leading-none ${compact ? "text-[clamp(1.35rem,3vw,2.35rem)]" : "text-[clamp(1.8rem,4.5vw,3.2rem)]"}`}>{copy.title}</strong>
            <span className={`mt-2 block whitespace-pre-line font-black leading-tight text-[#10243e] ${compact ? "text-[clamp(.52rem,1vw,.82rem)]" : "text-[clamp(.68rem,1.6vw,1rem)]"}`}>{copy.subtitle}</span>
          </span>
        </span>
      ) : (
        <span className={`absolute left-[11%] z-30 text-left font-black drop-shadow-[0_2px_5px_rgba(8,70,34,.22)] ${compact ? "top-[43%]" : "top-[31%]"}`}>
          <strong className={`block whitespace-nowrap leading-tight ${compact ? "text-[clamp(.9rem,2vw,1.45rem)]" : "text-[clamp(1.1rem,3vw,2rem)]"}`}>{copy.title}</strong>
          <span className={`mt-1 block whitespace-nowrap ${compact ? "text-[clamp(.45rem,.9vw,.72rem)]" : "text-[clamp(.58rem,1.4vw,.9rem)]"}`}>{copy.subtitle}</span>
        </span>
      )}

      <span className={`absolute bottom-[8%] left-[11%] z-30 rounded-full bg-white font-black shadow-[0_7px_16px_rgba(16,36,62,.2)] transition duration-300 group-hover:-translate-y-0.5 group-hover:shadow-[0_9px_20px_rgba(16,36,62,.28)] ${series.id === "1" ? "text-[#087eba]" : series.id === "2" ? "text-[#087f3c]" : "text-[#d98500]"} ${compact ? "px-3 py-1.5 text-[clamp(.5rem,.95vw,.75rem)]" : "px-4 py-2 text-[clamp(.65rem,1.4vw,.95rem)]"}`}>HỌC NGAY</span>

      <span aria-hidden="true" className="pointer-events-none absolute inset-y-[-25%] left-[-65%] z-40 w-[38%] rotate-[18deg] bg-gradient-to-r from-transparent via-white/55 to-transparent blur-[1px] transition-transform duration-700 ease-out group-hover:translate-x-[450%] group-focus-visible:translate-x-[450%] motion-reduce:hidden" />
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 z-30 bg-gradient-to-b from-white/12 via-transparent to-[#10243e]/10" />
    </Link>
  );
}
