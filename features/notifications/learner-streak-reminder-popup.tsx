"use client";

import { useEffect, useState, useTransition } from "react";
import { acknowledgeNotification } from "@/features/notifications/actions";
import type { LearnerStreakReminder } from "@/lib/data/notifications";

export function LearnerStreakReminderPopup({
  reminder,
}: {
  reminder: LearnerStreakReminder | null;
}) {
  const [isOpen, setIsOpen] = useState(Boolean(reminder));
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  if (!reminder || !isOpen) return null;
  const reminderId = reminder.id;

  function closeReminder(shouldStudy: boolean) {
    setIsOpen(false);
    if (!shouldStudy) return;

    window.setTimeout(() => {
      document
        .getElementById("khoa-hoc-dang-mo")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
    startTransition(async () => {
      await acknowledgeNotification(reminderId);
    });
  }

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-[#071b35]/55 px-4 py-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="streak-reminder-title"
      aria-describedby="streak-reminder-message"
    >
      <section className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-[0_28px_80px_rgba(7,27,53,.35)]">
        <div className="relative overflow-hidden bg-gradient-to-br from-[#075da4] via-[#087eba] to-[#25b8db] px-7 pb-7 pt-8 text-white">
          <div className="absolute -right-14 -top-16 h-52 w-52 rounded-full bg-white/12" />
          <div className="absolute right-16 top-8 h-2 w-2 rounded-full bg-amber-300" />
          <div className="absolute right-8 top-20 h-3 w-3 rounded-full bg-cyan-100/80" />
          <div className="relative flex items-start gap-4">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-white/30 bg-white/15 text-4xl shadow-inner" aria-hidden="true">
              🔥
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[.18em] text-cyan-100">Nhắc học hôm nay</p>
              <h2 id="streak-reminder-title" className="mt-1 text-2xl font-black leading-tight">
                {reminder.title}
              </h2>
              <p id="streak-reminder-message" className="mt-2 font-semibold leading-6 text-white/85">
                {reminder.message}
              </p>
            </div>
          </div>
        </div>

        <div className="px-7 py-6">
          <div className="rounded-2xl bg-[#edf8ff] px-4 py-3 text-sm font-bold leading-6 text-[#245d93]">
            Chỉ cần hoàn thành một bài học, một lượt ôn tập hoặc một đề thi để giữ chuỗi hôm nay.
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => closeReminder(false)}
              disabled={isPending}
              className="rounded-2xl border border-[#10243e]/12 bg-white px-5 py-3.5 font-black text-[#51657d] transition hover:bg-slate-50 disabled:opacity-60"
            >
              Nhắc lại sau
            </button>
            <button
              type="button"
              onClick={() => closeReminder(true)}
              disabled={isPending}
              className="rounded-2xl bg-gradient-to-r from-[#087eba] to-[#20a9d8] px-5 py-3.5 font-black text-white shadow-[0_10px_24px_rgba(8,126,186,.25)] transition hover:-translate-y-0.5 disabled:opacity-60"
            >
              Học ngay →
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
