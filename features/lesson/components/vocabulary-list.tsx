"use client";

import { useState } from "react";
import type { VocabularyItem } from "@/content/schema";
import { SaveToListButton } from "@/features/vocabulary-lists/save-to-list-button";

type VocabularyListProps = {
  lessonId: string;
  items: readonly VocabularyItem[];
  query: string;
  onQueryChange: (query: string) => void;
  onSpeak: (text: string, audioUrl?: string) => void;
};

function capitalizeFirst(value: string) {
  return value.charAt(0).toLocaleUpperCase("vi-VN") + value.slice(1);
}

export function VocabularyList({
  lessonId,
  items,
  query,
  onQueryChange,
  onSpeak,
}: VocabularyListProps) {
  const [visibleCount, setVisibleCount] = useState(10);
  const normalizedQuery = query.trim().toLocaleLowerCase("vi-VN");
  const filteredItems = items.filter((item) =>
    `${item.korean} ${item.vietnamese} ${item.romanization}`
      .toLocaleLowerCase("vi-VN")
      .includes(normalizedQuery),
  );
  const visibleItems = filteredItems.slice(0, visibleCount);
  const hasMore = visibleCount < filteredItems.length;
  const remainingCount = Math.max(filteredItems.length - visibleCount, 0);
  const nextCount = Math.min(10, remainingCount);

  return (
    <section className="mt-10 pb-14">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="inline-flex w-fit rounded-xl border-2 border-white bg-gradient-to-r from-[#10243e] to-[#245d93] px-5 py-3 text-2xl font-black text-white shadow-[5px_6px_0_rgba(7,18,36,0.75)] ring-1 ring-[#10243e]">
          Toàn bộ từ vựng
        </h2>
        <label className="w-full sm:max-w-sm">
          <span className="sr-only">Tìm kiếm từ vựng</span>
          <input
            value={query}
            onChange={(event) => {
              setVisibleCount(10);
              onQueryChange(event.target.value);
            }}
            placeholder="Tìm từ tiếng Hàn hoặc tiếng Việt…"
            className="w-full rounded-full border-2 border-[#10243e] bg-white px-5 py-3 text-sm font-semibold shadow-sm outline-none focus:ring-4 focus:ring-white/35"
          />
        </label>
      </div>

      {filteredItems.length === 0 ? (
        <div className="mt-5 rounded-3xl border border-white/80 bg-white/80 p-8 text-center shadow-sm">
          <p className="font-bold text-[#52637a]">
            Không tìm thấy từ phù hợp với “{query}”.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {visibleItems.map((item) => {
            const sourceIndex = items.findIndex(
              (sourceItem) => sourceItem.id === item.id,
            );
            const example = item.examples[0];

            return (
              <article
                key={item.id}
                className="overflow-hidden rounded-3xl border border-white/80 bg-white/80 shadow-[0_12px_28px_rgba(16,36,62,0.11)] transition hover:-translate-y-1 hover:shadow-[0_18px_34px_rgba(16,36,62,0.16)]"
              >
                <div className="flex min-h-32 items-start gap-4 p-6">
                  <span className="pt-1 text-sm font-black text-[#087eba]/65">
                    {sourceIndex + 1}.
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                      <p
                        lang="ko"
                        className="font-korean text-3xl font-black text-[#10243e]"
                      >
                        {item.korean}
                      </p>
                      <div>
                        <p className="text-sm font-semibold italic text-[#245d93]">
                          {item.romanization}
                        </p>
                        <p className="text-base font-black text-orange-700">
                          {capitalizeFirst(item.vietnamese)}
                        </p>
                        {item.partOfSpeech && (
                          <p className="mt-2 w-fit rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700">
                            {item.partOfSpeech}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onSpeak(item.korean, item.audioUrl)}
                      aria-label={`Phát âm ${item.korean}`}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-sky-200 bg-white/90 text-lg text-[#087eba] shadow-[0_6px_14px_rgba(16,36,62,0.12)] transition hover:-translate-y-0.5 hover:border-sky-400 hover:bg-sky-50"
                    >
                      🔊
                    </button>
                    <SaveToListButton lessonId={lessonId} item={item} />
                  </div>
                </div>
                {example && (
                  <div className="flex items-center gap-3 border-t border-emerald-200/70 bg-emerald-50/80 px-6 py-4">
                    <div className="min-w-0 flex-1">
                      <p
                        lang="ko"
                        className="font-korean text-lg font-bold text-[#123f3b]"
                      >
                        {example.korean}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[#52637a]">
                        → {example.vietnamese}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onSpeak(example.korean, example.audioUrl)
                      }
                      aria-label={`Phát âm ví dụ ${item.korean}`}
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-sky-200 bg-white/90 text-base text-[#087eba] shadow-sm transition hover:-translate-y-0.5 hover:bg-sky-50"
                    >
                      🔊
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
      {filteredItems.length > 10 && (
        <div className="mx-auto mt-8 max-w-xl rounded-3xl border border-white/40 bg-white/15 p-5 text-center shadow-[0_16px_38px_rgba(16,36,62,0.16)] backdrop-blur-sm">
          <p className="text-sm font-black text-white">
            Đang hiển thị{" "}
            <span className="rounded-full bg-[#10243e]/75 px-2.5 py-1">
              {Math.min(visibleCount, filteredItems.length)}/
              {filteredItems.length} từ
            </span>
          </p>
          {hasMore ? (
            <button
              type="button"
              onClick={() => setVisibleCount((count) => count + 10)}
              aria-label={`Xem thêm ${nextCount} từ ↓`}
              className="mt-4 inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#10243e] via-[#174f7f] to-[#087eba] px-6 py-3.5 font-black text-white shadow-[0_12px_26px_rgba(7,18,36,0.28)] ring-2 ring-white/65 transition hover:-translate-y-1 hover:shadow-[0_17px_32px_rgba(7,18,36,0.34)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-white/15 text-xl">
                ↓
              </span>
              <span>Xem thêm {nextCount} từ</span>
              <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs">
                Còn {remainingCount}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setVisibleCount(10)}
              className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-2xl border-2 border-white/80 bg-white px-6 py-3 font-black text-[#10243e] shadow-lg transition hover:-translate-y-0.5 hover:bg-sky-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              <span>↑</span>
              Thu gọn còn 10 từ
            </button>
          )}
          <p className="mt-3 text-sm font-semibold text-white/85">
            Bạn có thể dùng ô tìm kiếm phía trên để tìm nhanh hơn.
          </p>
        </div>
      )}
    </section>
  );
}
