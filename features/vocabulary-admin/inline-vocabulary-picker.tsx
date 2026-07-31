"use client";

import { useMemo, useState } from "react";
import type { VocabularyAdminItem } from "@/lib/data/vocabulary-admin";

const INITIAL_VISIBLE_COUNT = 10;
const LOAD_MORE_COUNT = 30;

export function InlineVocabularyPicker({
  items,
  selectedIds,
  onChange,
}: {
  items: VocabularyAdminItem[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const categories = [...new Set(items.map((item) => item.category))].sort(
    (a, b) => a.localeCompare(b, "vi"),
  );
  const normalizedQuery = query.trim().toLocaleLowerCase("vi");
  const filtered = items.filter(
    (item) =>
      (category === "all" || item.category === category) &&
      (!normalizedQuery ||
        item.hangul.toLocaleLowerCase("ko").includes(normalizedQuery) ||
        item.meaningVi.toLocaleLowerCase("vi").includes(normalizedQuery) ||
        item.romanization.toLowerCase().includes(normalizedQuery)),
  );
  const visible = filtered.slice(0, visibleCount);
  const filteredIds = filtered.map((item) => item.id);
  const allFilteredSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selected.has(id));
  const remaining = Math.max(filtered.length - visibleCount, 0);

  function updateSelection(next: Set<string>) {
    onChange([...next]);
  }

  function toggleAllFiltered() {
    const next = new Set(selected);
    if (allFilteredSelected) {
      filteredIds.forEach((id) => next.delete(id));
    } else {
      filteredIds.forEach((id) => next.add(id));
    }
    updateSelection(next);
  }

  return (
    <div className="mt-5">
      <div className="grid gap-3 lg:grid-cols-[minmax(16rem,1fr)_15rem_auto]">
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setVisibleCount(INITIAL_VISIBLE_COUNT);
          }}
          placeholder="Tìm Hangul, nghĩa Việt hoặc phiên âm..."
          className="rounded-xl border-2 border-slate-200 bg-white px-4 py-3 font-semibold outline-none focus:border-brand-500"
        />
        <select
          value={category}
          onChange={(event) => {
            setCategory(event.target.value);
            setVisibleCount(INITIAL_VISIBLE_COUNT);
          }}
          className="rounded-xl border-2 border-slate-200 bg-white px-4 py-3 font-semibold outline-none focus:border-brand-500"
        >
          <option value="all">Tất cả chủ đề</option>
          {categories.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
        <span className="grid place-items-center rounded-xl bg-white px-4 py-2 text-sm font-black text-brand-700">
          Đã chọn {selected.size} từ
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-bold text-ink-600">
          {filtered.length} từ phù hợp · Đổi bộ lọc không làm mất từ đã chọn.
        </p>
        <button
          type="button"
          onClick={toggleAllFiltered}
          disabled={filteredIds.length === 0}
          className="rounded-xl border-2 border-brand-200 bg-white px-4 py-2 text-sm font-black text-brand-700 transition hover:bg-blue-100 disabled:opacity-50"
        >
          {allFilteredSelected
            ? `Bỏ chọn ${filteredIds.length} từ đang lọc`
            : `✓ Chọn tất cả ${filteredIds.length} từ`}
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-blue-200 bg-white p-8 text-center font-bold text-ink-600">
          Không tìm thấy từ phù hợp.
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {visible.map((item) => {
            const checked = selected.has(item.id);
            return (
              <label
                key={item.id}
                className={`flex cursor-pointer items-center gap-4 rounded-2xl border-2 p-4 transition ${
                  checked
                    ? "border-brand-500 bg-white shadow-sm"
                    : "border-blue-100 bg-white/70 hover:border-blue-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    const next = new Set(selected);
                    if (checked) next.delete(item.id);
                    else next.add(item.id);
                    updateSelection(next);
                  }}
                  className="h-5 w-5 accent-blue-600"
                />
                <span className="min-w-0 flex-1">
                  <strong lang="ko" className="block text-xl">{item.hangul}</strong>
                  <span className="block font-bold text-orange-700">{item.meaningVi}</span>
                  <span className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-ink-600">{item.category}</span>
                    <span className={`rounded-full px-2.5 py-1 ${item.audioUrl ? "bg-violet-100 text-violet-700" : "bg-amber-50 text-amber-700"}`}>
                      {item.audioUrl ? "Có audio" : "Chưa có audio"}
                    </span>
                    {item.imageUrl && (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-700">Có ảnh</span>
                    )}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      )}

      {filtered.length > INITIAL_VISIBLE_COUNT && (
        <div className="mt-6 text-center">
          {remaining > 0 ? (
            <button
              type="button"
              onClick={() =>
                setVisibleCount((count) => count + LOAD_MORE_COUNT)
              }
              className="rounded-2xl bg-gradient-to-r from-brand-700 to-sky-500 px-6 py-3 font-black text-white shadow-lg transition hover:-translate-y-0.5"
            >
              Xem thêm {Math.min(LOAD_MORE_COUNT, remaining)} từ ↓
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setVisibleCount(INITIAL_VISIBLE_COUNT)}
              className="rounded-2xl border-2 border-brand-200 bg-white px-6 py-3 font-black text-brand-700"
            >
              Thu gọn còn 10 từ ↑
            </button>
          )}
        </div>
      )}
    </div>
  );
}
