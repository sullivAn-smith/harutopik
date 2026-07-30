"use client";

import Link from "next/link";
import { useState } from "react";
import type { VocabularyAdminItem } from "@/lib/data/vocabulary-admin";

const PAGE_SIZE = 30;

export function VocabularyLibrary({ items }: { items: VocabularyAdminItem[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const categories = [...new Set(items.map((item) => item.category))].sort();
  const normalized = query.trim().toLocaleLowerCase("vi");
  const filteredItems = items.filter(
    (item) =>
      (category === "all" || item.category === category) &&
      (!normalized ||
        item.hangul.toLocaleLowerCase("ko").includes(normalized) ||
        item.meaningVi.toLocaleLowerCase("vi").includes(normalized) ||
        item.romanization.toLowerCase().includes(normalized)),
  );
  const visibleItems = filteredItems.slice(0, visibleCount);
  const hasMore = visibleCount < filteredItems.length;
  const remainingCount = Math.max(filteredItems.length - visibleCount, 0);
  const nextCount = Math.min(PAGE_SIZE, remainingCount);

  return (
    <>
      <div className="mt-7 grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-[1fr_15rem]">
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setVisibleCount(PAGE_SIZE);
          }}
          placeholder="Tìm Hangul, nghĩa Việt hoặc phiên âm..."
          className="rounded-xl border-2 border-slate-200 px-4 py-3 font-semibold outline-none focus:border-brand-500"
        />
        <select
          value={category}
          onChange={(event) => {
            setCategory(event.target.value);
            setVisibleCount(PAGE_SIZE);
          }}
          className="rounded-xl border-2 border-slate-200 px-4 py-3 font-semibold"
        >
          <option value="all">Tất cả chủ đề</option>
          {categories.map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>
      <p className="mt-4 text-sm font-bold text-ink-600">
        {filteredItems.length} từ phù hợp
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visibleItems.map((item) => (
          <Link key={item.id} href={`/bien-tap/tu-vung/${item.id}`} className="surface-card bg-white p-5 transition hover:-translate-y-1 hover:border-brand-400">
            <div className="flex items-start justify-between gap-3">
              <div><p lang="ko" className="text-3xl font-black">{item.hangul}</p><p className="mt-1 text-sm font-bold text-brand-700">{item.romanization || "Chưa có phiên âm"}</p></div>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${item.status === "published" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>{item.status === "published" ? "Đã dùng" : "Bản nháp"}</span>
            </div>
            <p className="mt-4 text-lg font-black text-orange-700">{item.meaningVi}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-ink-600">
              <span className="rounded-full bg-slate-100 px-3 py-1">{item.category}</span>
              {item.partOfSpeech && <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">{item.partOfSpeech}</span>}
              <span className={`rounded-full px-3 py-1 ${item.audioUrl ? "bg-violet-100 text-violet-700" : "bg-amber-50 text-amber-700"}`}>{item.audioUrl ? "Có audio" : "Thiếu audio"}</span>
              {item.imageUrl && (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">
                  Có ảnh
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
      {filteredItems.length > PAGE_SIZE && (
        <div className="mx-auto mt-9 max-w-xl rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 to-blue-50 p-5 text-center shadow-[0_16px_34px_rgba(14,116,180,0.12)]">
          <p className="text-sm font-bold text-ink-600">
            Đang hiển thị{" "}
            <span className="rounded-full bg-white px-3 py-1 font-black text-brand-700 shadow-sm">
              {Math.min(visibleCount, filteredItems.length)}/
              {filteredItems.length} từ
            </span>
          </p>
          {hasMore ? (
            <button
              type="button"
              onClick={() =>
                setVisibleCount((count) => count + PAGE_SIZE)
              }
              aria-label={`Xem thêm ${nextCount} từ`}
              className="mt-4 inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-brand-700 to-sky-500 px-6 py-3.5 font-black text-white shadow-[0_12px_24px_rgba(2,132,199,0.24)] transition hover:-translate-y-1 hover:shadow-[0_16px_30px_rgba(2,132,199,0.3)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600"
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-white/15 text-lg">
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
              onClick={() => setVisibleCount(PAGE_SIZE)}
              className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-2xl border-2 border-brand-200 bg-white px-6 py-3 font-black text-brand-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-sky-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600"
            >
              <span>↑</span>
              Thu gọn còn 30 từ
            </button>
          )}
          <p className="mt-3 text-sm font-semibold text-ink-500">
            Dùng ô tìm kiếm phía trên để tìm từ nhanh hơn.
          </p>
        </div>
      )}
    </>
  );
}
