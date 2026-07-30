"use client";

import { useState } from "react";
import type { VocabularyAdminItem } from "@/lib/data/vocabulary-admin";
import { setLessonVocabulary } from "./actions";

const PAGE_SIZE = 30;

export function LessonVocabularyPicker({
  revisionId,
  items,
  selectedIds,
}: {
  revisionId: string;
  items: VocabularyAdminItem[];
  selectedIds: string[];
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState(new Set(selectedIds));
  const categories = [...new Set(items.map((item) => item.category))].sort(
    (a, b) => a.localeCompare(b, "vi"),
  );
  const value = query.trim().toLocaleLowerCase("vi");
  const filtered = items.filter(
    (item) =>
      (category === "all" || item.category === category) &&
      (!value ||
        item.hangul.toLocaleLowerCase("ko").includes(value) ||
        item.meaningVi.toLocaleLowerCase("vi").includes(value) ||
        item.romanization.toLowerCase().includes(value)),
  );
  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;
  const remaining = Math.max(filtered.length - visibleCount, 0);
  const nextCount = Math.min(PAGE_SIZE, remaining);

  return (
    <form action={setLessonVocabulary}>
      <input type="hidden" name="revisionId" value={revisionId} />
      {[...selected].map((id) => <input key={id} type="hidden" name="vocabularyIds" value={id} />)}
      <div className="sticky top-0 z-10 rounded-2xl border bg-white/95 p-4 shadow-sm backdrop-blur">
        <div className="grid gap-3 lg:grid-cols-[minmax(16rem,1fr)_15rem_auto_auto]">
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
            className="rounded-xl border-2 border-slate-200 bg-white px-4 py-3 font-semibold outline-none focus:border-brand-500"
          >
            <option value="all">Tất cả chủ đề</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <span className="grid place-items-center rounded-xl bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">
            Đã chọn {selected.size} từ
          </span>
          <button className="rounded-xl bg-brand-600 px-5 py-3 font-black text-white shadow-sm transition hover:bg-brand-700">
            Lưu bộ từ cho bài
          </button>
        </div>
        <p className="mt-3 text-sm font-bold text-ink-500">
          {filtered.length} từ phù hợp · Việc đổi tìm kiếm hoặc chủ đề không làm
          mất các từ đã chọn.
        </p>
      </div>
      {visible.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed bg-white p-10 text-center">
          <p className="font-black">Không tìm thấy từ phù hợp</p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setCategory("all");
              setVisibleCount(PAGE_SIZE);
            }}
            className="mt-2 font-black text-brand-700"
          >
            Xóa bộ lọc
          </button>
        </div>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {visible.map((item) => {
            const checked = selected.has(item.id);
            return (
              <label key={item.id} className={`flex cursor-pointer items-center gap-4 rounded-2xl border-2 p-4 transition ${checked ? "border-brand-500 bg-blue-50 shadow-sm" : "border-slate-200 bg-white hover:border-blue-300"}`}>
                <input type="checkbox" checked={checked} onChange={() => setSelected((current) => {
                  const next = new Set(current);
                  if (next.has(item.id)) next.delete(item.id); else next.add(item.id);
                  return next;
                })} className="h-5 w-5 accent-blue-600" />
                <span className="min-w-0 flex-1">
                  <strong lang="ko" className="block text-xl">{item.hangul}</strong>
                  <span className="mt-1 block font-bold text-orange-700">{item.meaningVi}</span>
                  <span className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-ink-600">{item.category}</span>
                    <span className={`rounded-full px-2.5 py-1 ${item.audioUrl ? "bg-violet-100 text-violet-700" : "bg-amber-50 text-amber-700"}`}>{item.audioUrl ? "Có audio" : "Chưa có audio"}</span>
                    {item.imageUrl && <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-700">Có ảnh</span>}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      )}
      {filtered.length > PAGE_SIZE && (
        <div className="mx-auto mt-8 max-w-xl rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 to-blue-50 p-5 text-center shadow-[0_16px_34px_rgba(14,116,180,0.12)]">
          <p className="text-sm font-bold text-ink-600">
            Đang hiển thị {Math.min(visibleCount, filtered.length)}/
            {filtered.length} từ
          </p>
          {hasMore ? (
            <button
              type="button"
              onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
              className="mt-4 inline-flex min-h-14 items-center gap-3 rounded-2xl bg-gradient-to-r from-brand-700 to-sky-500 px-6 py-3.5 font-black text-white shadow-lg transition hover:-translate-y-1"
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-white/15">
                ↓
              </span>
              Xem thêm {nextCount} từ
              <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs">
                Còn {remaining}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setVisibleCount(PAGE_SIZE)}
              className="mt-4 rounded-2xl border-2 border-brand-200 bg-white px-6 py-3 font-black text-brand-700"
            >
              ↑ Thu gọn còn 30 từ
            </button>
          )}
        </div>
      )}
    </form>
  );
}
