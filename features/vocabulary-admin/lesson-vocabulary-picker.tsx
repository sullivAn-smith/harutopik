"use client";

import { useState } from "react";
import type { VocabularyAdminItem } from "@/lib/data/vocabulary-admin";
import { setLessonVocabulary } from "./actions";

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
  const [selected, setSelected] = useState(new Set(selectedIds));
  const value = query.trim().toLocaleLowerCase("vi");
  const visible = items.filter(
    (item) =>
      !value ||
      item.hangul.toLocaleLowerCase("ko").includes(value) ||
      item.meaningVi.toLocaleLowerCase("vi").includes(value) ||
      item.romanization.toLowerCase().includes(value),
  );
  return (
    <form action={setLessonVocabulary}>
      <input type="hidden" name="revisionId" value={revisionId} />
      {[...selected].map((id) => <input key={id} type="hidden" name="vocabularyIds" value={id} />)}
      <div className="sticky top-0 z-10 rounded-2xl border bg-white/95 p-4 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm từ để thêm..." className="min-w-64 flex-1 rounded-xl border-2 border-slate-200 px-4 py-3 font-semibold outline-none focus:border-brand-500" />
          <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-black text-blue-700">Đã chọn {selected.size} từ</span>
          <button className="rounded-xl bg-brand-600 px-5 py-3 font-black text-white">Lưu bộ từ cho bài</button>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {visible.map((item) => {
          const checked = selected.has(item.id);
          return (
            <label key={item.id} className={`flex cursor-pointer items-center gap-4 rounded-2xl border-2 p-4 transition ${checked ? "border-brand-500 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-300"}`}>
              <input type="checkbox" checked={checked} onChange={() => setSelected((current) => {
                const next = new Set(current);
                if (next.has(item.id)) next.delete(item.id); else next.add(item.id);
                return next;
              })} className="h-5 w-5 accent-blue-600" />
              <span className="min-w-0 flex-1"><strong lang="ko" className="block text-xl">{item.hangul}</strong><span className="mt-1 block font-bold text-orange-700">{item.meaningVi}</span><span className="mt-1 block text-xs text-ink-600">{item.category} · {item.audioUrl ? "Có audio" : "Chưa có audio"}</span></span>
            </label>
          );
        })}
      </div>
    </form>
  );
}
