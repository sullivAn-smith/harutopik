import Image from "next/image";
import Link from "next/link";

import type { CurriculumSeriesDefinition } from "@/lib/catalog/curriculum-series";

const themeClasses = {
  blue: "from-[#16a7d8] via-[#087eba] to-[#123f72] text-white",
  cyan: "from-[#67e8f9] via-[#20b9cb] to-[#087f99] text-white",
  green: "from-[#86efac] via-[#34b978] to-[#14724e] text-white",
} satisfies Record<CurriculumSeriesDefinition["theme"], string>;

export function CurriculumSeriesCover({
  series,
  priority = false,
  compact = false,
}: {
  series: CurriculumSeriesDefinition;
  priority?: boolean;
  compact?: boolean;
}) {
  const isOriginalTopikCover = series.id === "1";

  return (
    <Link
      href={series.href}
      aria-label={`Mở bộ ${series.id}`}
      data-theme={series.theme}
      data-cover-variant={isOriginalTopikCover ? "topik-original" : "numbered"}
      className={`group relative block overflow-hidden border border-white/60 bg-gradient-to-br ${themeClasses[series.theme]} shadow-[0_16px_34px_rgba(16,36,62,0.24)] ring-1 ring-[#10243e]/25 transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_24px_42px_rgba(16,36,62,0.34)] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-white ${
        compact ? "aspect-[4/3] rounded-[1rem]" : "aspect-[3/4] rounded-[1.15rem]"
      }`}
    >
      <span aria-hidden="true" className="absolute inset-y-0 left-0 z-20 w-[5.5%] border-r border-white/25 bg-gradient-to-r from-[#10243e]/40 via-[#10243e]/18 to-white/10 shadow-[5px_0_10px_rgba(16,36,62,.18)]" />
      <span aria-hidden="true" className="absolute inset-y-[3%] left-[5.5%] z-20 w-px bg-white/30" />
      <span className="absolute -right-[16%] -top-[38%] aspect-square w-[72%] rounded-full bg-white/15" />
      <span className="absolute bottom-[-30%] left-[9%] aspect-square w-[58%] rounded-full border-[18px] border-white/10" />
      {series.coverAsset && (
        <Image
          src={series.coverAsset}
          alt=""
          fill
          priority={priority}
          sizes="(min-width: 1024px) 24vw, (min-width: 640px) 45vw, 88vw"
          className="object-cover opacity-28 mix-blend-multiply transition duration-300 group-hover:scale-105"
        />
      )}
      <span className="absolute inset-0 bg-gradient-to-t from-[#10243e]/18 via-transparent to-white/10" />
      <span className={`absolute left-[10%] top-[9%] z-30 flex flex-col items-start text-left drop-shadow-[0_3px_8px_rgba(16,36,62,.24)] ${compact ? "gap-0.5" : "gap-1"}`}>
        <span className={`font-black uppercase tracking-[.16em] text-white/90 ${compact ? "text-[clamp(.52rem,.85vw,.8rem)]" : "text-[clamp(.62rem,1vw,.9rem)]"}`}>
          Bộ sách
        </span>
        <strong className={`font-black leading-none text-white ${compact ? "text-[clamp(2.25rem,4.5vw,4.35rem)]" : "text-[clamp(2.7rem,6vw,5rem)]"}`}>
          {series.id}
        </strong>
      </span>
      {isOriginalTopikCover ? (
        <>
          <span className={`absolute grid place-items-center rounded-full bg-[#f4f8fc] text-center text-[#10243e] shadow-[0_0_0_8px_rgba(255,255,255,.14),0_12px_30px_rgba(16,36,62,.24)] ${compact ? "bottom-[12%] right-[8%] aspect-square w-[42%]" : "bottom-[12%] right-[9%] aspect-square w-[58%]"}`}>
            <span>
              <strong className={`block font-black leading-none ${compact ? "text-[clamp(1.4rem,2.8vw,2.5rem)]" : "text-[clamp(1.6rem,4vw,3rem)]"}`}>TOPIK</strong>
              <span className={`mt-2 block font-black leading-tight text-[#245d93] ${compact ? "text-[clamp(.56rem,1vw,.9rem)]" : "text-[clamp(.68rem,1.5vw,1rem)]"}`}>
                Nền tảng cho<br />người Việt
              </span>
            </span>
          </span>
          <span className={`absolute z-30 rounded-full bg-white px-4 py-2 font-black text-[#087eba] shadow-[0_8px_20px_rgba(16,36,62,.18)] ${compact ? "bottom-[10%] left-[10%] text-[clamp(.58rem,1vw,.88rem)]" : "bottom-[8%] left-[11%] text-[clamp(.7rem,1.35vw,1rem)]"}`}>
            HỌC NGAY
          </span>
        </>
      ) : null}
    </Link>
  );
}
