"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useState } from "react";
import type { VocabularyItem } from "@/content/schema";
import type { VocabularyListSummary } from "@/lib/vocabulary-lists/schema";

type ApiResponse<T> = { data?: T; error?: { code: string; message: string } };

export function SaveToListButton({
  lessonId,
  item,
  variant = "icon",
}: {
  lessonId: string;
  item: VocabularyItem;
  variant?: "icon" | "button";
}) {
  const [open, setOpen] = useState(false);
  const [lists, setLists] = useState<VocabularyListSummary[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [unauthenticated, setUnauthenticated] = useState(false);
  const [message, setMessage] = useState("");
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [returnHref, setReturnHref] = useState("/courses/topik-1");

  async function openMenu() {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen) {
      setReturnHref(`${window.location.pathname}${window.location.search}`);
    }
    if (!nextOpen || lists) return;

    setLoading(true);
    const response = await fetch(
      "/api/v1/vocabulary-lists?includeItems=true",
    );
    if (response.status === 401) {
      setUnauthenticated(true);
      setLoading(false);
      return;
    }
    const payload = (await response.json()) as ApiResponse<
      VocabularyListSummary[]
    >;
    setLists(payload.data ?? []);
    setLoading(false);
  }

  async function toggleList(list: VocabularyListSummary) {
    const saved = list.items?.some(
      (savedItem) => savedItem.vocabularyId === item.id,
    );
    setMessage("Đang lưu...");
    const endpoint = `/api/v1/vocabulary-lists/${list.id}/items${
      saved ? `/${encodeURIComponent(item.id)}` : ""
    }`;
    const response = await fetch(endpoint, {
      method: saved ? "DELETE" : "POST",
      headers: saved ? undefined : { "content-type": "application/json" },
      body: saved
        ? undefined
        : JSON.stringify({ vocabularyId: item.id, lessonId, item }),
    });
    if (!response.ok) {
      setMessage("Chưa thể cập nhật. Hãy thử lại.");
      return;
    }

    setLists((current) =>
      (current ?? []).map((candidate) => {
        if (candidate.id !== list.id) return candidate;
        const items = candidate.items ?? [];
        return {
          ...candidate,
          itemCount: candidate.itemCount + (saved ? -1 : 1),
          items: saved
            ? items.filter(
                (savedItem) => savedItem.vocabularyId !== item.id,
              )
            : [
                {
                  vocabularyId: item.id,
                  lessonId,
                  item,
                  createdAt: new Date().toISOString(),
                },
                ...items,
              ],
        };
      }),
    );
    setMessage(saved ? "Đã bỏ khỏi danh sách." : "Đã lưu từ.");
  }

  async function createListAndSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newName.trim().length < 2) {
      setMessage("Tên bộ từ cần ít nhất 2 ký tự.");
      return;
    }
    setCreating(true);
    setMessage("Đang tạo bộ từ...");
    const createResponse = await fetch("/api/v1/vocabulary-lists", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    const createPayload = (await createResponse.json()) as ApiResponse<VocabularyListSummary>;
    if (!createResponse.ok || !createPayload.data) {
      setMessage(createPayload.error?.message ?? "Chưa thể tạo bộ từ.");
      setCreating(false);
      return;
    }
    const newList = createPayload.data;
    const saveResponse = await fetch(`/api/v1/vocabulary-lists/${newList.id}/items`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ vocabularyId: item.id, lessonId, item }),
    });
    if (!saveResponse.ok) {
      setMessage("Đã tạo bộ nhưng chưa thể lưu từ. Hãy thử chọn lại bộ.");
      setLists((current) => [newList, ...(current ?? [])]);
      setCreating(false);
      return;
    }
    const savedList: VocabularyListSummary = {
      ...newList,
      itemCount: 1,
      items: [{
        vocabularyId: item.id,
        lessonId,
        item,
        createdAt: new Date().toISOString(),
      }],
    };
    setLists((current) => [savedList, ...(current ?? [])]);
    setNewName("");
    setCreating(false);
    setMessage(`Đã tạo “${newList.name}” và lưu từ.`);
  }

  const savedAnywhere = lists?.some((list) =>
    list.items?.some((savedItem) => savedItem.vocabularyId === item.id),
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => void openMenu()}
        className={`inline-flex items-center justify-center rounded-xl border font-black shadow-sm ${
          variant === "icon" ? "h-11 w-11 text-lg" : "h-11 gap-2 px-4 text-sm"
        } ${
          savedAnywhere
            ? "border-rose-300 bg-rose-50 text-rose-600"
            : "border-[#087eba]/30 bg-blue-50"
        }`}
        aria-label={`Lưu từ ${item.korean}`}
        aria-expanded={open}
      >
        <span>{savedAnywhere ? "♥" : "♡"}</span>
        {variant === "button" && <span>{savedAnywhere ? "Đã lưu vào bộ từ" : "Lưu vào bộ từ"}</span>}
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[80] flex items-start justify-center px-4 pt-[12vh]">
          <button type="button" aria-label="Đóng chọn bộ từ" onClick={() => setOpen(false)} className="absolute inset-0 bg-[#071224]/45 backdrop-blur-sm" />
          <div className="relative z-10 max-h-[76vh] w-full max-w-md overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div><p className="font-black text-ink-900">Lưu vào bộ từ</p><p className="mt-1 text-sm text-ink-600"><strong lang="ko">{item.korean}</strong> · {item.vietnamese}</p></div>
            <button type="button" onClick={() => setOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 font-black text-ink-600">×</button>
          </div>
          {loading && (
            <p className="mt-3 text-sm text-ink-600">Đang tải danh sách...</p>
          )}
          {unauthenticated && (
            <div className="mt-3 text-sm">
              <p className="text-ink-600">Đăng nhập để đồng bộ bộ từ.</p>
              <Link
                href="/dang-nhap"
                className="mt-2 inline-flex font-black text-brand-700"
              >
                Đăng nhập →
              </Link>
            </div>
          )}
          {lists && (
            <div className="mt-3 space-y-2">
              {lists.map((list) => {
                const saved = list.items?.some(
                  (savedItem) => savedItem.vocabularyId === item.id,
                );
                return (
                  <button
                    key={list.id}
                    type="button"
                    onClick={() => void toggleList(list)}
                    className="flex w-full items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-sm font-bold hover:bg-sky-50"
                  >
                    <span className="truncate">{list.name}</span>
                    <span className={saved ? "text-emerald-600" : "text-slate-400"}>
                      {saved ? "✓" : "+"}
                    </span>
                  </button>
                );
              })}
              <form onSubmit={(event) => void createListAndSave(event)} className="border-t border-slate-200 pt-3">
                <label className="text-xs font-black text-ink-600">
                  Hoặc tạo bộ mới
                  <div className="mt-2 flex gap-2">
                    <input
                      value={newName}
                      onChange={(event) => setNewName(event.target.value)}
                      minLength={2}
                      maxLength={60}
                      required
                      placeholder="Tên bộ từ..."
                      className="min-w-0 flex-1 rounded-xl border px-3 py-2 text-sm font-semibold outline-none focus:border-brand-500"
                    />
                    <button disabled={creating} className="rounded-xl bg-brand-600 px-3 py-2 text-sm font-black text-white disabled:opacity-50">
                      Tạo
                    </button>
                  </div>
                </label>
              </form>
              <Link
                href={`/tu-cua-toi?back=${encodeURIComponent(returnHref)}`}
                className="block pt-2 text-center text-sm font-black text-brand-700"
              >
                Quản lý các bộ từ
              </Link>
            </div>
          )}
          {message && (
            <p aria-live="polite" className="mt-3 text-xs font-bold text-ink-600">
              {message}
            </p>
          )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
