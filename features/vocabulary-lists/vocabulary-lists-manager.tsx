"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { VocabularyListSummary } from "@/lib/vocabulary-lists/schema";

type ApiResponse<T> = { data?: T; error?: { message: string } };
type SavedVocabularyItem = NonNullable<VocabularyListSummary["items"]>[number];
type PersonalVocabularyForm = {
  korean: string;
  vietnamese: string;
  romanization: string;
  partOfSpeech: string;
  example: string;
  category: string;
};

function isHighlightVocabulary(item: SavedVocabularyItem) {
  return (
    item.vocabularyId.startsWith("exam-highlight-") ||
    item.lessonId.startsWith("exam:")
  );
}

function personalVocabularyForm(item: SavedVocabularyItem): PersonalVocabularyForm {
  return {
    korean: item.item.korean,
    vietnamese: item.item.vietnamese,
    romanization: item.item.romanization,
    partOfSpeech:
      item.item.partOfSpeech === "Từ highlight"
        ? ""
        : (item.item.partOfSpeech ?? ""),
    example: item.item.examples[0]?.korean ?? "",
    category: item.item.category,
  };
}

export function VocabularyListsManager({ backHref }: { backHref: string }) {
  const [lists, setLists] = useState<VocabularyListSummary[]>([]);
  const [activeId, setActiveId] = useState("");
  const [newName, setNewName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [deleteCandidate, setDeleteCandidate] =
    useState<VocabularyListSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editCandidate, setEditCandidate] = useState<SavedVocabularyItem | null>(
    null,
  );
  const [editForm, setEditForm] = useState<PersonalVocabularyForm | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

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
  const filteredItems = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase("vi");
    const items = active?.items ?? [];
    if (!query) return items;
    return items.filter((savedItem) => [
      savedItem.item.korean,
      savedItem.item.vietnamese,
      savedItem.item.romanization,
      savedItem.item.partOfSpeech,
      savedItem.item.category,
      ...savedItem.item.examples.flatMap((example) => [example.korean, example.vietnamese]),
    ].some((value) => value?.toLocaleLowerCase("vi").includes(query)));
  }, [active, searchTerm]);
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

  function openEdit(item: SavedVocabularyItem) {
    setMessage("");
    setEditError("");
    setEditCandidate(item);
    setEditForm(personalVocabularyForm(item));
  }

  async function savePersonalVocabulary(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!active || !editCandidate || !editForm) return;

    setSavingEdit(true);
    const example = editForm.example.trim();
    const response = await fetch(
      `/api/v1/vocabulary-lists/${active.id}/items/${encodeURIComponent(editCandidate.vocabularyId)}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          item: {
            ...editCandidate.item,
            id: editCandidate.vocabularyId,
            korean: editForm.korean.trim(),
            vietnamese: editForm.vietnamese.trim(),
            romanization: editForm.romanization.trim(),
            category: editForm.category.trim(),
            partOfSpeech: editForm.partOfSpeech.trim() || undefined,
            examples: example
              ? [
                  {
                    id:
                      editCandidate.item.examples[0]?.id ??
                      `${editCandidate.vocabularyId}-example-1`,
                    korean: example,
                    vietnamese: editForm.vietnamese.trim(),
                  },
                ]
              : [],
          },
        }),
      },
    );
    const payload = (await response.json()) as ApiResponse<{
      updated: boolean;
    }>;
    if (!response.ok) {
      setEditError(
        payload.error?.message ?? "Chưa thể lưu thông tin của từ này.",
      );
      setSavingEdit(false);
      return;
    }

    setSavingEdit(false);
    setEditCandidate(null);
    setEditForm(null);
    setMessage("Đã cập nhật từ cá nhân. Các chế độ học sẽ dùng dữ liệu mới.");
    await reload(active.id);
  }

  return (
    <div className="mt-8">
      <form
        onSubmit={(event) => void createList(event)}
        className="flex flex-col gap-3 rounded-3xl border border-sky-100 bg-gradient-to-r from-sky-50 to-cyan-50 p-4 shadow-inner sm:flex-row"
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
            className="w-full rounded-2xl border-2 border-white bg-white px-5 py-3.5 font-semibold shadow-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-sky-100"
          />
        </label>
        <button className="rounded-2xl bg-brand-600 px-6 py-3.5 font-black text-white shadow-[0_10px_22px_rgba(8,126,186,.24)] transition hover:-translate-y-0.5 hover:bg-brand-700">
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
        <div className="mt-7 grid gap-7 lg:grid-cols-[250px_minmax(0,1fr)]">
          <aside className="h-fit space-y-2 rounded-3xl border border-slate-100 bg-slate-50/80 p-3">
            {lists.map((list) => (
              <button
                key={list.id}
                type="button"
                onClick={() => setActiveId(list.id)}
                className={`flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-left font-black transition ${
                  activeId === list.id
                    ? "bg-gradient-to-r from-brand-600 to-cyan-600 text-white shadow-[0_8px_18px_rgba(8,126,186,.22)]"
                    : "bg-white text-ink-900 ring-1 ring-slate-100 hover:bg-sky-50 hover:text-brand-700"
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

          <section className="min-w-0 rounded-3xl border border-slate-100 bg-white p-1 sm:p-5">
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
                      <>
                        <Link
                          href={`/speed-test?listId=${active.id}`}
                          className="rounded-xl bg-amber-100 px-4 py-2.5 font-black text-amber-800 transition hover:-translate-y-0.5 hover:bg-amber-200"
                        >
                          ⚡ Speed Test
                        </Link>
                        <Link
                          href={`/tu-cua-toi/${active.id}/hoc?back=${encodeURIComponent(backHref)}`}
                          className="rounded-xl bg-emerald-600 px-4 py-2.5 font-black text-white transition hover:-translate-y-0.5 hover:bg-emerald-700"
                        >
                          Học bộ này
                        </Link>
                      </>
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

                {!!active.itemCount && (
                  <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-sky-100 bg-sky-50/70 p-3">
                    <label className="relative min-w-0 flex-1">
                      <span className="sr-only">Tìm từ trong bộ {active.name}</span>
                      <span aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-slate-400">⌕</span>
                      <input
                        type="search"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Tìm tiếng Hàn, nghĩa hoặc phiên âm..."
                        className="w-full rounded-2xl border border-white bg-white py-3 pl-11 pr-11 font-semibold text-ink-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-sky-100"
                      />
                      {searchTerm && (
                        <button type="button" onClick={() => setSearchTerm("")} aria-label="Xóa nội dung tìm kiếm" className="absolute right-2.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">×</button>
                      )}
                    </label>
                    <span className="shrink-0 rounded-full bg-white px-4 py-2 text-sm font-black text-brand-700 shadow-sm ring-1 ring-sky-100">
                      {searchTerm.trim() ? `${filteredItems.length} kết quả` : `${active.itemCount} từ`}
                    </span>
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
                ) : filteredItems.length === 0 ? (
                  <div className="mt-6 rounded-3xl border-2 border-dashed border-sky-200 bg-sky-50/40 p-10 text-center">
                    <p className="text-lg font-black text-ink-900">Không tìm thấy từ phù hợp</p>
                    <p className="mt-2 text-sm font-semibold text-ink-600">Thử tìm bằng tiếng Hàn, nghĩa tiếng Việt hoặc phiên âm khác.</p>
                    <button type="button" onClick={() => setSearchTerm("")} className="mt-4 rounded-xl bg-white px-4 py-2 font-black text-brand-700 shadow-sm ring-1 ring-sky-100">Xóa tìm kiếm</button>
                  </div>
                ) : (
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    {filteredItems.map((savedItem) => (
                      <article
                        key={savedItem.vocabularyId}
                        className="group rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/60 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-[0_12px_25px_rgba(16,36,62,.09)]"
                      >
                        <div className="flex items-start gap-3">
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
                        </div>
                        {isHighlightVocabulary(savedItem) && (
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                              Từ highlight
                            </span>
                            <button
                              type="button"
                              onClick={() => openEdit(savedItem)}
                              className="rounded-xl bg-sky-50 px-3 py-2 text-sm font-black text-brand-700 transition hover:bg-sky-100"
                            >
                              Bổ sung thông tin →
                            </button>
                          </div>
                        )}
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
      {editCandidate &&
        editForm &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[95] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-personal-word-title"
          >
            <button
              type="button"
              aria-label="Đóng chỉnh sửa từ"
              onClick={() => {
                if (savingEdit) return;
                setEditCandidate(null);
                setEditForm(null);
              }}
              className="absolute inset-0 bg-[#071224]/55 backdrop-blur-sm"
            />
            <form
              onSubmit={(event) => void savePersonalVocabulary(event)}
              className="relative z-10 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-sky-100 bg-white shadow-2xl"
            >
              <div className="bg-gradient-to-br from-sky-50 to-indigo-50 px-6 py-6 sm:px-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[.18em] text-brand-600">
                      Từ cá nhân
                    </p>
                    <h2
                      id="edit-personal-word-title"
                      className="mt-1 text-3xl font-black text-ink-900"
                    >
                      Bổ sung để học tốt hơn
                    </h2>
                    <p className="mt-2 text-sm font-semibold text-ink-600">
                      Dữ liệu này chỉ thuộc bộ từ của bạn, không sửa nội dung gốc của đề.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={savingEdit}
                    onClick={() => {
                      setEditCandidate(null);
                      setEditForm(null);
                    }}
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-xl font-black text-ink-600 shadow-sm"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="grid gap-5 px-6 py-6 sm:grid-cols-2 sm:px-8">
                <EditField
                  label="Từ highlight"
                  value={editForm.korean}
                  required
                  lang="ko"
                  onChange={(value) =>
                    setEditForm((current) =>
                      current ? { ...current, korean: value } : current,
                    )
                  }
                />
                <EditField
                  label="Nghĩa tiếng Việt"
                  value={editForm.vietnamese}
                  required
                  onChange={(value) =>
                    setEditForm((current) =>
                      current ? { ...current, vietnamese: value } : current,
                    )
                  }
                />
                <EditField
                  label="Phiên âm"
                  value={editForm.romanization}
                  required
                  onChange={(value) =>
                    setEditForm((current) =>
                      current ? { ...current, romanization: value } : current,
                    )
                  }
                />
                <label className="block">
                  <span className="text-sm font-black text-ink-700">Từ loại</span>
                  <select
                    value={editForm.partOfSpeech}
                    onChange={(event) =>
                      setEditForm((current) =>
                        current
                          ? { ...current, partOfSpeech: event.target.value }
                          : current,
                      )
                    }
                    className="mt-2 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 font-bold text-ink-900 outline-none focus:border-brand-500"
                  >
                    <option value="">Chưa chọn</option>
                    <option>Danh từ</option>
                    <option>Động từ</option>
                    <option>Tính từ</option>
                    <option>Trạng từ</option>
                    <option>Đại từ</option>
                    <option>Tiểu từ</option>
                    <option>Biểu hiện</option>
                  </select>
                </label>
                <EditField
                  label="Ví dụ tiếng Hàn"
                  value={editForm.example}
                  lang="ko"
                  placeholder="Ví dụ có chứa từ này"
                  onChange={(value) =>
                    setEditForm((current) =>
                      current ? { ...current, example: value } : current,
                    )
                  }
                />
                <EditField
                  label="Chủ đề"
                  value={editForm.category}
                  required
                  placeholder="Ví dụ: Giao tiếp"
                  onChange={(value) =>
                    setEditForm((current) =>
                      current ? { ...current, category: value } : current,
                    )
                  }
                />
              </div>

              {editError && (
                <p
                  role="alert"
                  className="mx-6 mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700 sm:mx-8"
                >
                  {editError}
                </p>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 px-6 py-5 sm:flex-row sm:justify-end sm:px-8">
                <button
                  type="button"
                  disabled={savingEdit}
                  onClick={() => {
                    setEditCandidate(null);
                    setEditForm(null);
                  }}
                  className="rounded-xl border border-slate-200 px-5 py-3 font-black text-ink-700"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="rounded-xl bg-brand-600 px-6 py-3 font-black text-white transition hover:bg-brand-700 disabled:opacity-50"
                >
                  {savingEdit ? "Đang lưu..." : "Lưu từ cá nhân"}
                </button>
              </div>
            </form>
          </div>,
          document.body,
        )}
    </div>
  );
}

function EditField({
  label,
  value,
  onChange,
  required = false,
  placeholder,
  lang,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  lang?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-black text-ink-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      <input
        lang={lang}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        maxLength={240}
        placeholder={placeholder}
        className="mt-2 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 font-bold text-ink-900 outline-none focus:border-brand-500"
      />
    </label>
  );
}
