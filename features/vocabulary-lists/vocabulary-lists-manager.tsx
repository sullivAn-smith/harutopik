"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { VocabularyListSummary } from "@/lib/vocabulary-lists/schema";

type ApiResponse<T> = { data?: T; error?: { message: string } };

export function VocabularyListsManager() {
  const [lists, setLists] = useState<VocabularyListSummary[]>([]);
  const [activeId, setActiveId] = useState("");
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [studyIndex, setStudyIndex] = useState<number | null>(null);
  const [flipped, setFlipped] = useState(false);

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
  const studyItem =
    studyIndex === null ? null : active?.items?.[studyIndex] ?? null;

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
    if (!window.confirm(`Xoá bộ “${list.name}” và toàn bộ từ bên trong?`)) {
      return;
    }
    const response = await fetch(`/api/v1/vocabulary-lists/${list.id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      setMessage("Chưa thể xoá bộ từ.");
      return;
    }
    setStudyIndex(null);
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
    setStudyIndex(null);
    setMessage("Đã bỏ từ khỏi danh sách.");
    await reload(active.id);
  }

  function speak(text: string) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ko-KR";
    window.speechSynthesis.speak(utterance);
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
                onClick={() => {
                  setActiveId(list.id);
                  setStudyIndex(null);
                }}
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
                      <button
                        type="button"
                        onClick={() => {
                          setStudyIndex(0);
                          setFlipped(false);
                        }}
                        className="rounded-xl bg-emerald-600 px-4 py-2.5 font-black text-white"
                      >
                        Học bộ này
                      </button>
                    )}
                    {active.kind === "custom" && (
                      <button
                        type="button"
                        onClick={() => void deleteList(active)}
                        className="rounded-xl border border-red-200 px-4 py-2.5 font-bold text-red-600"
                      >
                        Xoá bộ
                      </button>
                    )}
                  </div>
                </div>

                {studyItem && studyIndex !== null && (
                  <div className="mt-6 rounded-3xl bg-gradient-to-br from-sky-100 to-blue-50 p-6 text-center">
                    <p className="text-sm font-bold text-ink-600">
                      {studyIndex + 1}/{active.items?.length}
                    </p>
                    <button
                      type="button"
                      onClick={() => setFlipped((value) => !value)}
                      className="mt-4 min-h-52 w-full rounded-3xl bg-white p-8 shadow-sm"
                    >
                      <span
                        lang={flipped ? "vi" : "ko"}
                        className="block text-4xl font-black text-ink-900"
                      >
                        {flipped
                          ? studyItem.item.vietnamese
                          : studyItem.item.korean}
                      </span>
                      <span className="mt-4 block text-sm font-semibold text-ink-600">
                        {flipped
                          ? studyItem.item.romanization
                          : "Chạm để xem nghĩa"}
                      </span>
                    </button>
                    <div className="mt-4 flex flex-wrap justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => speak(studyItem.item.korean)}
                        className="rounded-xl bg-white px-4 py-2 font-black"
                      >
                        🔊 Nghe
                      </button>
                      <button
                        type="button"
                        disabled={studyIndex === 0}
                        onClick={() => {
                          setStudyIndex(Math.max(0, studyIndex - 1));
                          setFlipped(false);
                        }}
                        className="rounded-xl bg-white px-4 py-2 font-black disabled:opacity-40"
                      >
                        ← Trước
                      </button>
                      <button
                        type="button"
                        disabled={studyIndex === (active.items?.length ?? 1) - 1}
                        onClick={() => {
                          setStudyIndex(studyIndex + 1);
                          setFlipped(false);
                        }}
                        className="rounded-xl bg-brand-600 px-4 py-2 font-black text-white disabled:opacity-40"
                      >
                        Tiếp →
                      </button>
                    </div>
                  </div>
                )}

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
    </div>
  );
}
