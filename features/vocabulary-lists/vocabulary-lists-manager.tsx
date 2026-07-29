"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { VocabularyListSummary } from "@/lib/vocabulary-lists/schema";

type ApiResponse<T> = { data?: T; error?: { message: string } };

export function VocabularyListsManager({ backHref }: { backHref: string }) {
  const [lists, setLists] = useState<VocabularyListSummary[]>([]);
  const [activeId, setActiveId] = useState("");
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [deleteCandidate, setDeleteCandidate] =
    useState<VocabularyListSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function reload(preferredId?: string) {
    setLoading(true);
    const response = await fetch(
      "/api/v1/vocabulary-lists?includeItems=true",
    );
    const payload = (await response.json()) as ApiResponse<
      VocabularyListSummary[]
    >;
    if (!response.ok) {
      setMessage(payload.error?.message ?? "Chưa thể tải các bộ từ.");
      setLoading(false);
      return;
    }
    const nextLists = payload.data ?? [];
    setLists(nextLists);
    setActiveId((current) => {
      const candidate = preferredId ?? current;
      return nextLists.some((list) => list.id === candidate)
        ? candidate
        : (nextLists[0]?.id ?? "");
    });
    setLoading(false);
  }

  useEffect(() => {
    let mounted = true;
    void fetch("/api/v1/vocabulary-lists?includeItems=true")
      .then(async (response) => {
        const payload = (await response.json()) as ApiResponse<
          VocabularyListSummary[]
        >;
        if (!mounted) return;
        if (!response.ok) {
          setMessage(payload.error?.message ?? "Chưa thể tải các bộ từ.");
          return;
        }
        const nextLists = payload.data ?? [];
        setLists(nextLists);
        setActiveId(nextLists[0]?.id ?? "");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const active = useMemo(
    () => lists.find((list) => list.id === activeId) ?? null,
    [activeId, lists],
  );
  async function createList(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/v1/vocabulary-lists", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    const payload = (await response.json()) as ApiResponse<
      VocabularyListSummary
    >;
    if (!response.ok || !payload.data) {
      setMessage(payload.error?.message ?? "Chưa thể tạo bộ từ.");
      return;
    }
    setNewName("");
    setMessage("Đã tạo bộ từ mới.");
    await reload(payload.data.id);
  }

  async function deleteList(list: VocabularyListSummary) {
    if (list.kind !== "custom") return;
    setDeleting(true);
    const response = await fetch(`/api/v1/vocabulary-lists/${list.id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      setMessage("Chưa thể xoá bộ từ.");
      setDeleting(false);
      return;
    }
    setDeleteCandidate(null);
    setDeleting(false);
    setMessage("Đã xoá bộ từ.");
    await reload();
  }

  async function removeItem(vocabularyId: string) {
    if (!active) return;
    const response = await fetch(
      `/api/v1/vocabulary-lists/${active.id}/items/${encodeURIComponent(vocabularyId)}`,
      { method: "DELETE" },
    );
    if (!response.ok) {
      setMessage("Chưa thể bỏ từ khỏi danh sách.");
      return;
    }
    setMessage("Đã bỏ từ khỏi danh sách.");
    await reload(active.id);
  }

  return (
    <div className="mt-8">
      <form
        onSubmit={(event) => void createList(event)}
        className="flex flex-col gap-3 rounded-2xl bg-sky-50 p-4 sm:flex-row"
      >
        <label className="min-w-0 flex-1">
          <span className="sr-only">Tên bộ từ mới</span>
          <input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            minLength={2}
            maxLength={60}
            required
            placeholder="Ví dụ: Từ khó TOPIK I"
            className="w-full rounded-xl border-2 border-white bg-white px-4 py-3 font-semibold outline-none focus:border-brand-500"
          />
        </label>
        <button className="rounded-xl bg-brand-600 px-5 py-3 font-black text-white">
          + Tạo bộ từ
        </button>
      </form>

      {message && (
        <p role="status" className="mt-4 text-sm font-bold text-ink-600">
          {message}
        </p>
      )}

      {loading ? (
        <p className="mt-8 text-center font-semibold text-ink-600">
          Đang tải bộ từ...
        </p>
      ) : (
        <div className="mt-7 grid gap-6 lg:grid-cols-[240px_1fr]">
          <aside className="space-y-2">
            {lists.map((list) => (
              <button
                key={list.id}
                type="button"
                onClick={() => setActiveId(list.id)}
                className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left font-black ${
                  activeId === list.id
                    ? "bg-brand-600 text-white"
                    : "bg-slate-100 text-ink-900 hover:bg-sky-50"
                }`}
              >
                <span className="truncate">
                  {list.kind === "favorites" ? "♥ " : ""}
                  {list.name}
                </span>
                <span className="ml-3 text-sm opacity-75">{list.itemCount}</span>
              </button>
            ))}
          </aside>

          <section className="min-w-0">
            {active && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-black text-ink-900">
                      {active.name}
                    </h2>
                    <p className="mt-1 text-sm text-ink-600">
                      {active.itemCount} từ đã lưu
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {!!active.itemCount && (
                      <Link
                        href={`/tu-cua-toi/${active.id}/hoc?back=${encodeURIComponent(backHref)}`}
                        className="rounded-xl bg-emerald-600 px-4 py-2.5 font-black text-white transition hover:-translate-y-0.5 hover:bg-emerald-700"
                      >
                        Học bộ này
                      </Link>
                    )}
                    {active.kind === "custom" && (
                      <button
                        type="button"
                        onClick={() => setDeleteCandidate(active)}
                        className="rounded-xl border border-red-200 bg-white px-4 py-2.5 font-bold text-red-600 transition hover:border-red-300 hover:bg-red-50"
                      >
                        Xoá bộ từ
                      </button>
                    )}
                  </div>
                </div>

                {!active.itemCount ? (
                  <div className="mt-6 rounded-3xl border-2 border-dashed border-slate-200 p-10 text-center">
                    <p className="font-black text-ink-900">
                      Bộ từ này đang trống
                    </p>
                    <p className="mt-2 text-sm text-ink-600">
                      Mở một bài học và bấm ♡ cạnh từ bạn muốn lưu.
                    </p>
                  </div>
                ) : (
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {active.items?.map((savedItem) => (
                      <article
                        key={savedItem.vocabularyId}
                        className="flex items-start gap-3 rounded-2xl border bg-white p-4"
                      >
                        <div className="min-w-0 flex-1">
                          <p
                            lang="ko"
                            className="font-korean text-xl font-black text-ink-900"
                          >
                            {savedItem.item.korean}
                          </p>
                          <p className="mt-1 font-bold text-orange-700">
                            {savedItem.item.vietnamese}
                          </p>
                          <p className="mt-1 text-sm italic text-ink-600">
                            {savedItem.item.romanization}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            void removeItem(savedItem.vocabularyId)
                          }
                          className="rounded-lg px-2 py-1 text-sm font-bold text-red-500 hover:bg-red-50"
                          aria-label={`Bỏ từ ${savedItem.item.korean}`}
                        >
                          ×
                        </button>
                      </article>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      )}
      {deleteCandidate &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[90] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-list-title"
          >
            <button
              type="button"
              aria-label="Đóng xác nhận xoá"
              onClick={() => !deleting && setDeleteCandidate(null)}
              className="absolute inset-0 bg-[#071224]/55 backdrop-blur-sm"
            />
            <div className="relative z-10 w-full max-w-md overflow-hidden rounded-[2rem] border border-red-100 bg-white shadow-2xl">
              <div className="bg-gradient-to-br from-red-50 to-orange-50 px-6 py-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-2xl">
                  🗑
                </div>
                <h2
                  id="delete-list-title"
                  className="mt-4 text-2xl font-black text-ink-900"
                >
                  Xoá bộ từ “{deleteCandidate.name}”?
                </h2>
                <p className="mt-3 leading-7 text-ink-600">
                  Toàn bộ <strong>{deleteCandidate.itemCount} từ đã lưu</strong>{" "}
                  sẽ bị xoá khỏi bộ này. Từ gốc trong bài học không bị ảnh hưởng.
                </p>
              </div>
              <div className="px-6 py-5">
                <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                  Thao tác này không thể hoàn tác.
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => setDeleteCandidate(null)}
                    className="rounded-xl border border-slate-200 px-4 py-3 font-black text-ink-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Giữ lại bộ từ
                  </button>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => void deleteList(deleteCandidate)}
                    className="rounded-xl bg-red-600 px-4 py-3 font-black text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleting ? "Đang xoá..." : "Xác nhận xoá"}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
