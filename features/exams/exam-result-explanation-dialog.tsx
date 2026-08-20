"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

export function ExamResultExplanationDialog({
  explanation,
  questionNumber,
  options,
  correctOption,
  selectedOption,
  showTextOptions = false,
  children,
}: {
  explanation: string;
  questionNumber: number;
  options: string[];
  correctOption: number;
  selectedOption?: number;
  showTextOptions?: boolean;
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
            className="max-h-[80dvh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:p-7"
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
            {showTextOptions && options.length > 0 && (
              <div className="mt-5">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                  Các đáp án
                </p>
                <ol
                  aria-label={`Các đáp án câu nghe ${questionNumber}`}
                  className="mt-2 grid grid-cols-4 gap-2.5"
                >
                  {options.slice(0, 4).map((option, index) => {
                    const optionNumber = index + 1;
                    const isCorrect = optionNumber === correctOption;
                    const isSelectedWrong =
                      optionNumber === selectedOption && !isCorrect;
                    return (
                      <li
                        key={`${optionNumber}-${option}`}
                        className={`min-w-0 rounded-2xl border-2 px-3 py-3 ${
                          isCorrect
                            ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                            : isSelectedWrong
                              ? "border-red-400 bg-red-50 text-red-900"
                              : "border-slate-200 bg-slate-50 text-slate-700"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span
                            className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-black ${
                              isCorrect
                                ? "bg-emerald-600 text-white"
                                : isSelectedWrong
                                  ? "bg-red-500 text-white"
                                  : "bg-white text-slate-600 shadow-sm"
                            }`}
                          >
                            {optionNumber}
                          </span>
                          <span
                            lang="ko"
                            className="font-korean min-w-0 break-words text-sm font-bold leading-6"
                          >
                            {option}
                          </span>
                        </div>
                        {isCorrect && (
                          <span className="mt-2 block text-[11px] font-black uppercase tracking-wide text-emerald-700">
                            Đáp án đúng
                          </span>
                        )}
                        {isSelectedWrong && (
                          <span className="mt-2 block text-[11px] font-black uppercase tracking-wide text-red-700">
                            Bạn đã chọn
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
            <p className="mt-5 font-semibold text-slate-600">
              Bạn chọn: {selectedOption ? `${selectedOption}. ${options[selectedOption - 1] ?? ""}` : "Chưa trả lời"}
            </p>
            <p className="mt-1 font-bold text-emerald-700">
              Đáp án: {correctOption}. {options[correctOption - 1] ?? ""}
            </p>
            <p className="mt-5 whitespace-pre-wrap rounded-2xl bg-amber-50 p-5 text-sm leading-7 text-slate-700">
              {explanation}
            </p>
          </section>
        </div>
      )}
    </>
  );
}
