"use client";

import Link from "next/link";
import { useState } from "react";
import type { VocabularyItem } from "@/content/schema";
import type { VocabularyListSummary } from "@/lib/vocabulary-lists/schema";

type ApiResponse<T> = { data?: T; error?: { code: string; message: string } };

export function SaveToListButton({
  lessonId,
  item,
}: {
  lessonId: string;
  item: VocabularyItem;
}) {
  const [open, setOpen] = useState(false);
  const [lists, setLists] = useState<VocabularyListSummary[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [unauthenticated, setUnauthenticated] = useState(false);
  const [message, setMessage] = useState("");

  async function openMenu() {
    const nextOpen = !open;
    setOpen(nextOpen);
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

  const savedAnywhere = lists?.some((list) =>
    list.items?.some((savedItem) => savedItem.vocabularyId === item.id),
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => void openMenu()}
        className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border text-lg shadow-sm ${
          savedAnywhere
            ? "border-rose-300 bg-rose-50 text-rose-600"
            : "border-[#087eba]/30 bg-blue-50"
        }`}
        aria-label={`Lưu từ ${item.korean}`}
        aria-expanded={open}
      >
        {savedAnywhere ? "♥" : "♡"}
      </button>

      {open && (
        <div className="absolute right-0 top-13 z-30 w-72 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-xl">
          <p className="font-black text-ink-900">Lưu vào bộ từ</p>
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
              <Link
                href="/tu-cua-toi"
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
      )}
    </div>
  );
}
