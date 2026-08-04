"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ExamHighlightListPicker } from "@/features/exams/exam-highlight-list-picker";

export type ExamResultHighlight = {
  id: string;
  selectedText: string;
  color: string;
  reviewListId: string | null;
};

function highlightClasses(color: string) {
  if (color === "blue") return "border-sky-200 bg-sky-100 text-sky-900";
  if (color === "pink") return "border-pink-200 bg-pink-100 text-pink-900";
  return "border-yellow-200 bg-yellow-100 text-yellow-900";
}

export function ExamResultHighlights({
  attemptId,
  initialHighlights,
}: {
  attemptId: string;
  initialHighlights: ExamResultHighlight[];
}) {
  const [highlights, setHighlights] = useState(initialHighlights);
  const [selected, setSelected] = useState<ExamResultHighlight | null>(null);
  const [message, setMessage] = useState("");
  const savedCount = useMemo(
    () => highlights.filter((highlight) => highlight.reviewListId).length,
    [highlights],
  );

  return (
    <section className="mt-7 rounded-3xl bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-amber-600">
            Từ đã đánh dấu
          </p>
          <h2 className="mt-1 text-2xl font-black">
            {highlights.length} từ highlight · {savedCount} từ đã lưu
          </h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Bấm “Lưu” để đưa đúng từ đã chọn vào một bộ từ và bổ sung nghĩa sau.
          </p>
        </div>
        <Link
          href="/tu-cua-toi"
          className="rounded-xl bg-[#087eba] px-5 py-3 font-black text-white shadow-sm transition hover:bg-[#076c9f]"
        >
          {savedCount > 0 ? `Mở ${savedCount} từ đã lưu →` : "Mở bộ từ của tôi →"}
        </Link>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {highlights.map((highlight) => (
          <div
            key={highlight.id}
            className={`inline-flex items-center gap-2 rounded-full border py-1.5 pl-4 pr-1.5 font-bold ${highlightClasses(highlight.color)}`}
          >
            <span>{highlight.selectedText}</span>
            {highlight.reviewListId ? (
              <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-black text-emerald-700">
                ✓ Đã lưu
              </span>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMessage("");
                  setSelected(highlight);
                }}
                className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#087eba] shadow-sm transition hover:-translate-y-0.5"
              >
                ＋ Lưu
              </button>
            )}
          </div>
        ))}
      </div>

      {message && (
        <p role="status" className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          {message}
        </p>
      )}

      {selected && (
        <ExamHighlightListPicker
          attemptId={attemptId}
          highlightId={selected.id}
          text={selected.selectedText}
          onClose={() => setSelected(null)}
          onSaved={(listId, listName) => {
            setHighlights((current) =>
              current.map((highlight) =>
                highlight.id === selected.id
                  ? { ...highlight, reviewListId: listId }
                  : highlight,
              ),
            );
            setSelected(null);
            setMessage(`Đã lưu “${selected.selectedText}” vào bộ “${listName}”.`);
          }}
        />
      )}
    </section>
  );
}
