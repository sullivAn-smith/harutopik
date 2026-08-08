"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type {
  LearnerStreak,
  LearnerStreakRules,
} from "@/lib/data/streaks";

const dayLabels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function vietnamTodayParts() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });
  const parts = formatter.formatToParts(new Date());
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return {
    iso: `${get("year")}-${get("month")}-${get("day")}`,
    weekday: get("weekday"),
  };
}

function currentWeekDates() {
  const today = vietnamTodayParts();
  const [year, month, day] = today.iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  const jsDay = date.getUTCDay();
  const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay;
  return Array.from({ length: 7 }, (_, index) => {
    const current = new Date(date);
    current.setUTCDate(date.getUTCDate() + mondayOffset + index);
    return current.toISOString().slice(0, 10);
  });
}

export function StreakBanner({
  streak,
  rules,
  period,
}: {
  streak: LearnerStreak | null;
  rules: LearnerStreakRules;
  period: "day" | "night";
}) {
  const [showHelp, setShowHelp] = useState(false);
  useEffect(() => {
    if (!showHelp) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowHelp(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [showHelp]);
  const week = currentWeekDates();
  const today = vietnamTodayParts().iso;
  const completed = new Set(streak?.activityDates ?? []);
  const current = streak?.currentStreak ?? 0;

  return (
    <section
      aria-label="Chuỗi ngày học"
      className={`relative min-h-[8.5rem] overflow-hidden rounded-3xl border border-white/30 px-4 py-3 text-white shadow-[0_16px_34px_rgba(14,46,101,.24)] ${
        period === "night"
          ? "bg-[linear-gradient(120deg,#092d62_0%,#173e94_56%,#242f88_100%)]"
          : "bg-[linear-gradient(120deg,#087eba_0%,#249dd4_52%,#5ebce3_100%)]"
      }`}
    >
      <div className={`pointer-events-none absolute -right-14 -top-16 h-52 w-52 rounded-full ${period === "night" ? "bg-indigo-300/10" : "bg-white/10"}`} />
      {period === "night" ? (
        <>
          <div className="pointer-events-none absolute right-[7%] top-4 h-8 w-8 rounded-full bg-amber-100 shadow-[0_0_28px_rgba(254,240,138,.55)]" />
          <div className="pointer-events-none absolute left-[44%] top-3 h-1.5 w-1.5 rounded-full bg-amber-200 shadow-[50px_28px_0_1px_rgba(255,231,137,.7),110px_-4px_0_rgba(255,255,255,.65),260px_16px_0_rgba(255,255,255,.5)]" />
        </>
      ) : (
        <>
          <div className="pointer-events-none absolute right-[7%] top-3 h-12 w-12 rounded-full bg-amber-100/55 shadow-[0_0_38px_rgba(254,240,138,.45)]" />
          <div className="pointer-events-none absolute left-[43%] top-3 h-1.5 w-1.5 rounded-full bg-amber-200 shadow-[50px_28px_0_1px_rgba(255,231,137,.7),110px_-4px_0_rgba(255,255,255,.65)]" />
        </>
      )}
      <Image
        src="/harutopik-mascot-transparent.png"
        alt="Chim cánh cụt Haru giữ chuỗi học"
        width={170}
        height={170}
        className="pointer-events-none absolute -bottom-2 left-1 hidden h-24 w-24 object-contain object-bottom md:block"
      />

      <div className="relative grid h-full min-w-0 items-center gap-3 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-4 md:pl-16">
        <div className="min-w-0">
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span aria-hidden="true" className="text-2xl drop-shadow-sm">🔥</span>
            <strong className="text-4xl font-black leading-none text-amber-300">{current}</strong>
            <span className="text-sm font-black text-white">ngày streak</span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] font-black">
            <span className="rounded-full border border-white/20 bg-white/10 px-2 py-1 text-white/90">
              Kỷ lục {streak?.longestStreak ?? current} ngày
            </span>
            <span
              className="rounded-full border border-cyan-100/40 bg-cyan-50/15 px-2 py-1 text-white"
              title="Khiên được tự động dùng để bảo vệ chuỗi khi bạn bỏ lỡ một ngày"
            >
              🛡 {streak?.shieldCount ?? 0} khiên
            </span>
            <button
              type="button"
              onClick={() => setShowHelp(true)}
              className="grid h-6 w-6 place-items-center rounded-full border border-white/35 bg-white/15 text-xs text-white transition hover:bg-white/25 focus:outline-none focus:ring-2 focus:ring-amber-300"
              aria-label="Xem cách streak và khiên hoạt động"
              title="Streak hoạt động thế nào?"
            >
              ?
            </button>
          </div>
        </div>

        <div className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 shadow-inner shadow-white/5">
          <div className="relative grid grid-cols-7 items-start gap-1 sm:gap-2">
            {week.map((date, index) => {
              const isDone = completed.has(date);
              const isToday = date === today;
              const isFuture = date > today;
              return (
                <div key={date} className="relative text-center">
                  <span className={`text-[10px] font-black ${isToday ? "text-amber-300" : "text-white/75"}`}>{dayLabels[index]}</span>
                  <div className="relative mt-0.5">
                    {index < week.length - 1 && (
                      <span className="pointer-events-none absolute left-[calc(50%+.875rem)] right-[calc(-50%+.875rem)] top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-white/25" />
                    )}
                    <span className={`relative z-10 mx-auto grid h-7 w-7 place-items-center rounded-full border-2 text-xs font-black transition ${
                      isDone
                        ? "border-white bg-white text-[#087eba] shadow-[0_3px_10px_rgba(7,52,96,.14)]"
                        : isToday
                          ? "border-amber-300 bg-white/95 text-orange-500 shadow-[0_0_0_4px_rgba(251,191,36,.18)]"
                          : isFuture
                            ? "border-white/25 bg-[#168fc7]/65 text-white/35"
                            : "border-white/35 bg-white/10 text-white/55"
                    }`}>{isDone ? "✓" : isToday ? "🔥" : ""}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-1.5 text-center text-[11px] font-bold text-white/85">Học thêm 1 ngày để giữ chuỗi!</p>
        </div>
      </div>

      {showHelp && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-[#071b34]/65 p-4 text-[#10243e] backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setShowHelp(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="streak-help-title"
            className="w-full max-w-lg rounded-[2rem] border border-white bg-white p-6 shadow-[0_28px_80px_rgba(7,27,52,.35)] sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[.16em] text-[#087eba]">Động lực mỗi ngày</p>
                <h2 id="streak-help-title" className="mt-2 text-2xl font-black">Streak & khiên bảo vệ</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-lg font-black text-slate-600 transition hover:bg-slate-200"
                aria-label="Đóng hướng dẫn"
              >
                ×
              </button>
            </div>

            <div className="mt-5 grid gap-3">
              <article className="rounded-2xl bg-orange-50 p-4">
                <h3 className="font-black text-orange-800">🔥 Streak được tính thế nào?</h3>
                <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">Hoàn thành ít nhất một bài học, lượt ôn tập hoặc đề thi trong ngày. Học nhiều lần vẫn chỉ cộng một ngày, theo giờ Việt Nam.</p>
              </article>
              <article className="rounded-2xl bg-cyan-50 p-4">
                <h3 className="font-black text-cyan-900">🛡 Khiên bảo vệ làm gì?</h3>
                <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">Nếu bạn bỏ lỡ một ngày, hệ thống tự dùng một khiên để giữ chuỗi. Bạn không cần bật hoặc sử dụng thủ công.</p>
              </article>
              <article className="rounded-2xl bg-emerald-50 p-4">
                <h3 className="font-black text-emerald-900">🎁 Nhận thêm khiên</h3>
                <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">Mỗi {rules.shieldRewardInterval} ngày streak, bạn nhận {rules.shieldRewardAmount} khiên. Có thể tự tích tối đa {rules.maxShields} khiên.</p>
              </article>
            </div>

            <div className="mt-5 flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
              <span className="text-sm font-bold text-slate-500">Khiên hiện có</span>
              <strong className="text-lg font-black text-[#087eba]">🛡 {streak?.shieldCount ?? 0}</strong>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
