"use client";

import Link from "next/link";
import { useState } from "react";
import type { VocabularyAdminItem } from "@/lib/data/vocabulary-admin";

export function VocabularyLibrary({ items }: { items: VocabularyAdminItem[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const categories = [...new Set(items.map((item) => item.category))].sort();
  const normalized = query.trim().toLocaleLowerCase("vi");
  const visible = items.filter(
    (item) =>
      (category === "all" || item.category === category) &&
      (!normalized ||
        item.hangul.toLocaleLowerCase("ko").includes(normalized) ||
        item.meaningVi.toLocaleLowerCase("vi").includes(normalized) ||
        item.romanization.toLowerCase().includes(normalized)),
  );
  return (
    <>
      <div className="mt-7 grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-[1fr_15rem]">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm Hangul, nghĩa Việt hoặc phiên âm..." className="rounded-xl border-2 border-slate-200 px-4 py-3 font-semibold outline-none focus:border-brand-500" />
        <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-xl border-2 border-slate-200 px-4 py-3 font-semibold">
          <option value="all">Tất cả chủ đề</option>
          {categories.map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>
      <p className="mt-4 text-sm font-bold text-ink-600">{visible.length} từ phù hợp</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((item) => (
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
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
