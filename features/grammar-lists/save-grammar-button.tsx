"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import type { GrammarPoint } from "@/content/schema";
import type { GrammarListSummary } from "@/lib/grammar-lists/schema";

type ApiResponse<T> = { data?: T; error?: { message: string } };

let pendingListsRequest: Promise<{ responseStatus: number; lists: GrammarListSummary[] }> | null = null;

function fetchGrammarLists() {
  if (!pendingListsRequest) {
    pendingListsRequest = fetch("/api/v1/grammar-lists?includeItems=true", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({})) as ApiResponse<GrammarListSummary[]>;
        return { responseStatus: response.status, lists: payload.data ?? [] };
      })
      .finally(() => {
        pendingListsRequest = null;
      });
  }
  return pendingListsRequest;
}

export function SaveGrammarButton({ lessonId, item }: { lessonId: string; item: GrammarPoint }) {
  const [open, setOpen] = useState(false);
  const [lists, setLists] = useState<GrammarListSummary[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [returnHref, setReturnHref] = useState("/courses/topik-1");

  useEffect(() => {
    let live = true;
    fetchGrammarLists()
      .then(({ responseStatus, lists: savedLists }) => {
        if (!live) return;
        if (responseStatus === 401) return;
        setLists(savedLists);
      })
      .catch(() => {
        // The menu still retries when the learner opens it.
      });
    return () => { live = false; };
  }, []);

  async function openMenu() {
    const next = !open; setOpen(next);
    if (next) setReturnHref(`${window.location.pathname}${window.location.search}`);
    if (!next || lists) return;
    setLoading(true);
    try {
      const { responseStatus, lists: savedLists } = await fetchGrammarLists();
      if (responseStatus === 401) setMessage("Đăng nhập để đồng bộ bộ ngữ pháp.");
      else setLists(savedLists);
    } catch {
      setMessage("Chưa thể tải bộ ngữ pháp. Hãy thử lại.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleList(list: GrammarListSummary) {
    const saved = list.items?.some((entry) => entry.grammarId === item.id);
    setMessage("Đang lưu...");
    const response = await fetch(`/api/v1/grammar-lists/${list.id}/items${saved ? `/${encodeURIComponent(item.id)}` : ""}`, { method: saved ? "DELETE" : "POST", headers: saved ? undefined : { "content-type": "application/json" }, body: saved ? undefined : JSON.stringify({ grammarId: item.id, lessonId, item }) });
    const payload = await response.json().catch(() => ({})) as ApiResponse<unknown>;
    if (!response.ok) { setMessage(payload.error?.message ?? "Chưa thể cập nhật. Hãy thử lại."); return; }
    setLists((current) => (current ?? []).map((candidate) => candidate.id !== list.id ? candidate : { ...candidate, itemCount: candidate.itemCount + (saved ? -1 : 1), items: saved ? (candidate.items ?? []).filter((entry) => entry.grammarId !== item.id) : [{ grammarId: item.id, lessonId, item, createdAt: new Date().toISOString() }, ...(candidate.items ?? [])] }));
    setMessage(saved ? "Đã bỏ khỏi danh sách." : "Đã lưu ngữ pháp.");
  }

  async function createListAndSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setCreating(true);
    const createdResponse = await fetch("/api/v1/grammar-lists", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: newName }) });
    const createdPayload = await createdResponse.json() as ApiResponse<GrammarListSummary>;
    if (!createdResponse.ok || !createdPayload.data) { setMessage(createdPayload.error?.message ?? "Chưa thể tạo bộ ngữ pháp."); setCreating(false); return; }
    const list = createdPayload.data;
    const savedResponse = await fetch(`/api/v1/grammar-lists/${list.id}/items`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ grammarId: item.id, lessonId, item }) });
    if (!savedResponse.ok) { setMessage("Đã tạo bộ nhưng chưa thể lưu ngữ pháp."); setLists((current) => [list, ...(current ?? [])]); setCreating(false); return; }
    setLists((current) => [{ ...list, itemCount: 1, items: [{ grammarId: item.id, lessonId, item, createdAt: new Date().toISOString() }] }, ...(current ?? [])]);
    setNewName(""); setCreating(false); setMessage(`Đã tạo “${list.name}” và lưu ngữ pháp.`);
  }

  const savedAnywhere = lists?.some((list) => list.items?.some((entry) => entry.grammarId === item.id));
  return <div className="relative">
    <button type="button" onClick={() => void openMenu()} aria-label={`Lưu ngữ pháp ${item.form}`} aria-expanded={open} className={`inline-flex h-11 w-11 items-center justify-center rounded-full border text-lg font-black shadow-[0_6px_14px_rgba(16,36,62,0.12)] transition hover:-translate-y-0.5 ${savedAnywhere ? "border-rose-300 bg-rose-50 text-rose-600" : "border-sky-200 bg-white/90 text-[#087eba] hover:border-sky-400 hover:bg-sky-50"}`}>{savedAnywhere ? "♥" : "♡"}</button>
    {open && typeof document !== "undefined" && createPortal(<div className="fixed inset-0 z-[80] flex items-start justify-center px-4 pt-[12vh]">
      <button type="button" aria-label="Đóng chọn bộ ngữ pháp" onClick={() => setOpen(false)} className="absolute inset-0 bg-[#071224]/45 backdrop-blur-sm" />
      <div className="relative z-10 max-h-[76vh] w-full max-w-md overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-2xl">
        <div className="flex items-start justify-between gap-4"><div><p className="font-black text-ink-900">Lưu vào bộ ngữ pháp</p><p className="mt-1 text-sm text-ink-600"><strong lang="ko">{item.form}</strong> · {item.title}</p></div><button type="button" onClick={() => setOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 font-black text-ink-600">×</button></div>
        {loading && <p className="mt-3 text-sm text-ink-600">Đang tải danh sách...</p>}
        {lists && <div className="mt-3 space-y-2">{lists.map((list) => { const saved = list.items?.some((entry) => entry.grammarId === item.id); return <button key={list.id} type="button" onClick={() => void toggleList(list)} className="flex w-full items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-sm font-bold hover:bg-sky-50"><span className="truncate">{list.name}</span><span className={saved ? "text-emerald-600" : "text-slate-400"}>{saved ? "✓" : "+"}</span></button>; })}
          <form onSubmit={(event) => void createListAndSave(event)} className="border-t border-slate-200 pt-3"><label className="text-xs font-black text-ink-600">Hoặc tạo bộ mới<div className="mt-2 flex gap-2"><input value={newName} onChange={(event) => setNewName(event.target.value)} minLength={2} maxLength={60} required placeholder="Tên bộ ngữ pháp..." className="min-w-0 flex-1 rounded-xl border px-3 py-2 text-sm font-semibold outline-none focus:border-brand-500"/><button disabled={creating} className="rounded-xl bg-brand-600 px-3 py-2 text-sm font-black text-white disabled:opacity-50">Tạo</button></div></label></form>
          <Link href={`/ngu-phap-cua-toi?back=${encodeURIComponent(returnHref)}`} className="block pt-2 text-center text-sm font-black text-brand-700">Quản lý các bộ ngữ pháp</Link>
        </div>}
        {message && <p aria-live="polite" className="mt-3 text-xs font-bold text-ink-600">{message}</p>}
      </div>
    </div>, document.body)}
  </div>;
}
