"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { VocabularyListSummary } from "@/lib/vocabulary-lists/schema";

type ApiResponse<T> = { data?: T; error?: { message?: string } };

export function ExamHighlightListPicker({
  attemptId,
  highlightId,
  text,
  onClose,
  onSaved,
}: {
  attemptId: string;
  highlightId: string;
  text: string;
  onClose: () => void;
  onSaved: (listId: string, listName: string) => void;
}) {
  const [lists, setLists] = useState<VocabularyListSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingListId, setSavingListId] = useState("");
  const [newName, setNewName] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    void fetch("/api/v1/vocabulary-lists")
      .then(async (response) => {
        const payload = await response.json() as ApiResponse<VocabularyListSummary[]>;
        if (!response.ok) throw new Error(payload.error?.message ?? "Chưa thể tải bộ từ.");
        if (active) setLists(payload.data ?? []);
      })
      .catch((error: unknown) => {
        if (active) setMessage(error instanceof Error ? error.message : "Chưa thể tải bộ từ.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  async function saveToList(
    list: VocabularyListSummary,
    options: { allowWhileCreating?: boolean } = {},
  ) {
    if (savingListId && !options.allowWhileCreating) return;
    setSavingListId(list.id);
    setMessage("Đang lưu từ...");
    const response = await fetch(`/api/v1/exam-attempts/${attemptId}/highlights/${highlightId}/review`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ listId: list.id }),
    });
    const payload = await response.json() as ApiResponse<{ listId: string; listName: string }>;
    if (!response.ok || !payload.data) {
      setMessage(payload.error?.message ?? "Chưa thể lưu từ. Hãy thử lại.");
      setSavingListId("");
      return;
    }
    onSaved(payload.data.listId, payload.data.listName);
  }

  async function createListAndSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newName.trim();
    if (name.length < 2) {
      setMessage("Tên bộ từ cần ít nhất 2 ký tự.");
      return;
    }
    setSavingListId("new");
    setMessage("Đang tạo bộ từ...");
    const response = await fetch("/api/v1/vocabulary-lists", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const payload = await response.json() as ApiResponse<VocabularyListSummary>;
    if (!response.ok || !payload.data) {
      setMessage(payload.error?.message ?? "Chưa thể tạo bộ từ.");
      setSavingListId("");
      return;
    }
    await saveToList(
      { ...payload.data, itemCount: 0 },
      { allowWhileCreating: true },
    );
  }

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[12vh]">
      <button type="button" aria-label="Đóng chọn bộ từ" onClick={onClose} className="absolute inset-0 bg-[#071224]/50 backdrop-blur-sm" />
      <section role="dialog" aria-modal="true" aria-labelledby="review-list-title" className="relative z-10 max-h-[76vh] w-full max-w-md overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-emerald-600">Ôn lại sau</p>
            <h2 id="review-list-title" className="mt-1 text-2xl font-black text-[#10243e]">Chọn bộ từ</h2>
            <p className="mt-2 rounded-xl bg-yellow-50 px-3 py-2 font-bold text-yellow-900">{text}</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 font-black text-slate-600">×</button>
        </div>

        {loading && <p className="mt-5 font-bold text-slate-500">Đang tải bộ từ...</p>}
        {!loading && <div className="mt-5 space-y-2">
          {lists.map((list) => <button key={list.id} type="button" disabled={Boolean(savingListId)} onClick={() => void saveToList(list)} className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left font-black text-[#10243e] transition hover:border-sky-300 hover:bg-sky-50 disabled:opacity-50">
            <span className="truncate">{list.name}</span>
            <span className="text-sm text-slate-500">{savingListId === list.id ? "Đang lưu..." : `${list.itemCount} từ　＋`}</span>
          </button>)}
          {lists.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">Bạn chưa có bộ từ. Hãy tạo bộ đầu tiên bên dưới.</p>}
        </div>}

        <form onSubmit={(event) => void createListAndSave(event)} className="mt-5 border-t border-slate-200 pt-5">
          <label htmlFor="new-review-list" className="text-sm font-black text-slate-600">Hoặc tạo bộ mới</label>
          <div className="mt-2 flex gap-2">
            <input id="new-review-list" value={newName} onChange={(event) => setNewName(event.target.value)} minLength={2} maxLength={60} placeholder="Ví dụ: Từ TOPIK cần ôn" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 font-semibold outline-none focus:border-sky-400" />
            <button type="submit" disabled={Boolean(savingListId)} className="rounded-xl bg-[#087eba] px-4 py-2.5 font-black text-white disabled:opacity-50">Tạo</button>
          </div>
        </form>
        {message && <p aria-live="polite" className="mt-4 text-sm font-bold text-slate-600">{message}</p>}
      </section>
    </div>,
    document.body,
  );
}
