"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { LessonProgressSnapshot } from "@/lib/learning-core/lesson-progress";

const progressRows: Array<{
  key: keyof LessonProgressSnapshot["components"];
  label: string;
}> = [
  { key: "vocabulary", label: "Từ vựng" },
];

export function LessonProgressDialog({
  open,
  progress,
  speedTestHref,
  onClose,
  onContinue,
}: {
  open: boolean;
  progress: LessonProgressSnapshot;
  speedTestHref?: string;
  onClose: () => void;
  onContinue: () => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  useDialogLifecycle(open, onClose, closeButtonRef);
  if (!open) return null;

  const unlocked = progress.speedTestUnlocked;

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-[#071b32]/55 px-4 py-8 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="lesson-progress-dialog-title"
        className="max-h-full w-full max-w-xl overflow-y-auto rounded-[2rem] border border-white/80 bg-white p-6 text-[#10243e] shadow-[0_30px_80px_rgba(7,27,50,.35)] sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[.2em] text-[#087eba]">
              Tiến độ bài học
            </p>
            <h2
              id="lesson-progress-dialog-title"
              className="mt-2 text-3xl font-black"
            >
              {unlocked
                ? "Speed Test đã mở khóa"
                : "Hoàn thành bài để mở Speed Test"}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Đóng thông tin tiến độ"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-xl font-black text-slate-500 transition hover:bg-slate-200"
          >
            ×
          </button>
        </div>

        <div className="mt-6 rounded-2xl bg-sky-50 p-5">
          <div className="flex items-end justify-between gap-3">
            <p className="font-black">
              {unlocked
                ? "Đã sẵn sàng thử thách"
                : `Đã hoàn thành ${progress.completionPercent}%`}
            </p>
            <strong className="text-3xl text-[#087eba]">
              {progress.completionPercent}%
            </strong>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-white">
            <div
              className={`h-full rounded-full ${
                unlocked
                  ? "bg-gradient-to-r from-emerald-400 to-emerald-600"
                  : "bg-gradient-to-r from-sky-400 to-[#087eba]"
              }`}
              style={{ width: `${progress.completionPercent}%` }}
            />
          </div>
          <p className="mt-3 text-sm font-semibold leading-6 text-[#52637a]">
            {unlocked
              ? "Quyền truy cập được giữ vĩnh viễn, kể cả khi bài học được cập nhật."
              : `Đánh dấu đã thuộc toàn bộ từ trong flashcard để đạt ${progress.unlockThreshold}% và mở khóa.`}
          </p>
        </div>

        <div className="mt-5 space-y-3">
          {progressRows.map((row) => {
            const value = progress.components[row.key];
            return (
              <div key={row.key}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-bold text-[#52637a]">{row.label}</span>
                  <strong>{value}%</strong>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-500"
                    style={{ width: `${value}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold leading-6 text-amber-900">
          {progress.recommendation}
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {unlocked && speedTestHref ? (
            <Link
              href={speedTestHref}
              className="rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-3.5 text-center font-black text-[#10243e] shadow-sm"
            >
              ⚡ Vào Speed Test
            </Link>
          ) : (
            <button
              type="button"
              onClick={onContinue}
              className="rounded-2xl bg-[#087eba] px-5 py-3.5 font-black text-white shadow-sm"
            >
              Tiếp tục học
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3.5 font-black text-slate-600"
          >
            Đóng
          </button>
        </div>
      </section>
    </div>
  );
}

export function RestartLessonDialog({
  open,
  onClose,
  onRestart,
}: {
  open: boolean;
  onClose: () => void;
  onRestart: () => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  useDialogLifecycle(open, onClose, closeButtonRef);
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-[#071b32]/45 px-4 py-8 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="restored-session-dialog-title"
        className="w-full max-w-md rounded-[2rem] border border-white/80 bg-white p-6 text-[#10243e] shadow-[0_30px_80px_rgba(7,27,50,.3)]"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[.18em] text-emerald-700">
              Phiên học
            </p>
            <h2
              id="restored-session-dialog-title"
              className="mt-2 text-2xl font-black"
            >
              Học lại bài từ đầu?
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Đóng thông tin phiên học"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-xl font-black text-slate-500"
          >
            ×
          </button>
        </div>
        <p className="mt-4 font-semibold leading-7 text-[#52637a]">
          Vị trí và trạng thái luyện tập hiện tại sẽ được đặt lại. Tiến độ đã
          đồng bộ trên tài khoản vẫn được giữ để bạn không mất thành quả.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl bg-emerald-600 px-5 py-3.5 font-black text-white"
          >
            Tiếp tục bài hiện tại
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3.5 font-black text-emerald-900"
          >
            Học lại từ đầu
          </button>
        </div>
      </section>
    </div>
  );
}

function useDialogLifecycle(
  open: boolean,
  onClose: () => void,
  closeButtonRef: React.RefObject<HTMLButtonElement | null>,
) {
  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [closeButtonRef, onClose, open]);
}
