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
      className={`group relative block overflow-hidden border-2 border-white/65 bg-gradient-to-br ${themeClasses[series.theme]} shadow-[0_16px_34px_rgba(16,36,62,0.24)] ring-1 ring-[#10243e]/20 transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_24px_42px_rgba(16,36,62,0.34)] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-white ${
        compact ? "aspect-[4/3] rounded-[1.75rem]" : "aspect-[3/4] rounded-[2rem]"
      }`}
    >
      <span className="absolute inset-y-0 left-0 w-[7%] bg-gradient-to-r from-[#10243e]/28 to-transparent" />
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
      {isOriginalTopikCover ? (
        <>
          <span className={`absolute grid place-items-center rounded-full bg-[#f4f8fc] text-center text-[#10243e] shadow-[0_0_0_10px_rgba(255,255,255,.14),0_12px_30px_rgba(16,36,62,.24)] ${compact ? "left-[10%] top-[10%] h-[58%] w-[42%]" : "left-[13%] top-[13%] aspect-square w-[67%]"}`}>
            <span>
              <strong className={`block font-black leading-none ${compact ? "text-[clamp(1.4rem,2.8vw,2.5rem)]" : "text-[clamp(1.6rem,4vw,3rem)]"}`}>TOPIK</strong>
              <span className={`mt-2 block font-black leading-tight text-[#245d93] ${compact ? "text-[clamp(.56rem,1vw,.9rem)]" : "text-[clamp(.68rem,1.5vw,1rem)]"}`}>
                Nền tảng cho<br />người Việt
              </span>
            </span>
          </span>
          <span className={`absolute rounded-full bg-white px-5 py-2 font-black text-[#087eba] shadow-[0_8px_20px_rgba(16,36,62,.18)] ${compact ? "bottom-[9%] left-[10%] text-[clamp(.65rem,1.2vw,1rem)]" : "bottom-[8%] left-[14%] text-[clamp(.75rem,1.5vw,1.1rem)]"}`}>
            HỌC NGAY
          </span>
          <span className={`absolute bottom-[5%] right-[8%] -rotate-6 font-black italic leading-none drop-shadow-[0_8px_16px_rgba(16,36,62,.3)] ${compact ? "text-[clamp(3.4rem,7vw,6.8rem)]" : "text-[clamp(4rem,9vw,7.4rem)]"}`}>
            {series.id}
          </span>
        </>
      ) : (
        <span className="absolute bottom-[8%] right-[9%] -rotate-6 text-[clamp(3.2rem,7vw,6.8rem)] font-black italic leading-none drop-shadow-[0_8px_16px_rgba(16,36,62,.3)]">
          {series.id}
        </span>
      )}
    </Link>
  );
}
