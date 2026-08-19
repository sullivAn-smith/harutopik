"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

export function ExamResultExplanationDialog({
  explanation,
  questionNumber,
  children,
}: {
  explanation: string;
  questionNumber: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  function close() {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="mt-4 inline-flex items-center rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-black text-amber-800 transition hover:-translate-y-0.5 hover:bg-amber-100"
      >
        Xem giải chi tiết
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={`explanation-title-${questionNumber}`}
            className="max-h-[80dvh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-amber-600">
                  Giải chi tiết
                </p>
                <h2 id={`explanation-title-${questionNumber}`} className="mt-1 text-2xl font-black text-[#10243e]">
                  Câu {questionNumber}
                </h2>
              </div>
              <button
                ref={closeRef}
                type="button"
                aria-label="Đóng giải chi tiết"
                onClick={close}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-xl font-black text-slate-600 transition hover:bg-slate-200"
              >
                ×
              </button>
            </div>
            <div className="mt-5 border-t border-slate-100 pt-5">
              {children}
            </div>
            <p className="mt-5 whitespace-pre-wrap rounded-2xl bg-amber-50 p-5 text-sm leading-7 text-slate-700">
              {explanation}
            </p>
          </section>
        </div>
      )}
    </>
  );
}
