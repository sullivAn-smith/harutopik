"use client";

import { useEffect, useState } from "react";

const pdfUrl = "/downloads/harutopik-bang-luyen-viet-hangul.pdf";

export function HangulPdfActions() {
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (!previewOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = "";
    };
  }, [previewOpen]);

  return (
    <>
      <div className="w-full shrink-0 rounded-2xl border border-white/35 bg-white p-3 text-[#10243e] shadow-[0_16px_34px_rgba(16,36,62,0.22)] lg:w-auto">
        <div className="flex items-center gap-3 px-2 pb-3 pt-1">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#087eba] text-xl font-black text-white">
            PDF
          </span>
          <span>
            <strong className="block text-base font-black">Bảng luyện viết Hangul</strong>
            <span className="mt-0.5 block text-sm font-bold text-[#65758b]">
              4 trang A4 · 454 KB
            </span>
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="rounded-xl bg-[#10243e] px-4 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#1e4774]"
          >
            Xem trước
          </button>
          <a
            href={pdfUrl}
            download="Harutopik-Bang-Luyen-Viet-Hangul.pdf"
            className="rounded-xl bg-[#087eba] px-4 py-3 text-center text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#096fa2]"
          >
            Tải PDF ↓
          </a>
        </div>
      </div>

      {previewOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="hangul-pdf-preview-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#08182b]/80 p-3 backdrop-blur-sm md:p-6"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setPreviewOpen(false);
          }}
        >
          <div className="flex h-[94dvh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/25 bg-white shadow-[0_28px_80px_rgba(0,0,0,0.42)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 md:px-5">
              <div>
                <h2 id="hangul-pdf-preview-title" className="font-black text-[#10243e]">
                  Xem trước bảng luyện viết Hangul
                </h2>
                <p className="text-xs font-bold text-[#65758b]">PDF · 4 trang A4</p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={pdfUrl}
                  download="Harutopik-Bang-Luyen-Viet-Hangul.pdf"
                  className="rounded-xl bg-[#087eba] px-4 py-2.5 text-sm font-black text-white hover:bg-[#096fa2]"
                >
                  Tải về ↓
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewOpen(false)}
                  aria-label="Đóng xem trước PDF"
                  className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-xl font-black text-[#10243e] hover:bg-slate-100"
                >
                  ×
                </button>
              </div>
            </div>
            <iframe
              src={`${pdfUrl}#view=FitH`}
              title="Bản xem trước bảng luyện viết Hangul"
              className="min-h-0 flex-1 bg-slate-100"
            />
            <p className="border-t border-slate-200 bg-white px-4 py-2 text-center text-xs font-semibold text-[#65758b]">
              Nếu thiết bị không hiển thị PDF, hãy chọn “Tải về” để mở bằng ứng dụng đọc PDF.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
