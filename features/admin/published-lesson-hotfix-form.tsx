"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { Lesson } from "@/content/schema";
import {
  applyPublishedLessonHotfix,
} from "./hotfix-actions";
import { SentenceAudioButton } from "./sentence-audio-button";
import { VocabularyListAudioButton } from "./vocabulary-list-audio-button";
import { VocabularyExampleAudioButton } from "./vocabulary-example-audio-button";
import {
  GrammarExerciseImport,
  type GrammarExerciseDraft,
} from "./grammar-exercise-import";

const fieldClass =
  "mt-2 w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 font-semibold outline-none focus:border-violet-500";
const VOCABULARY_PAGE_SIZE = 30;
const MAX_DICTATION_COUNT = 15;
const MAX_TRANSLATION_COUNT = 15;

export function PublishedLessonHotfixForm({ lesson }: { lesson: Lesson }) {
  const [state, action, pending] = useActionState(
    applyPublishedLessonHotfix,
    { status: "idle" as const },
  );
  const [dictations, setDictations] = useState(
    lesson.exercises
      .filter((exercise) => exercise.type === "dictation")
      .map((exercise) => ({
        id: exercise.id,
        sentence: exercise.sentence,
        audioUrl: exercise.audioUrl,
        acceptedAnswers: exercise.acceptedAnswers ?? [],
        points: exercise.points,
      })),
  );
  const [translations, setTranslations] = useState(
    lesson.exercises
      .filter((exercise) => exercise.type === "translation")
      .map((exercise) => ({
        id: exercise.id,
        vietnamese: exercise.vietnamese,
        korean: exercise.korean,
        acceptedVietnameseAnswers: exercise.acceptedVietnameseAnswers,
        acceptedKoreanAnswers: exercise.acceptedKoreanAnswers,
        points: exercise.points,
      })),
  );
  const [dictationExpanded, setDictationExpanded] = useState(false);
  const [translationExpanded, setTranslationExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"vocabulary" | "grammar">(
    "vocabulary",
  );
  const [grammar, setGrammar] = useState(
    lesson.grammar.map((point) => ({
      id: point.id,
      title: point.title,
      form: point.form,
      explanation: point.explanation,
      formula: point.formula,
      examples: point.examples.map((example) => ({ ...example })),
    })),
  );
  const [grammarExercises, setGrammarExercises] = useState<
    Array<GrammarExerciseDraft & { id?: string; points?: number }>
  >(
    lesson.exercises
      .filter((exercise) => exercise.type === "fill-blank")
      .map((exercise) => ({
        id: exercise.id,
        prompt: exercise.prompt,
        translation: exercise.translation,
        acceptedAnswers: exercise.acceptedAnswers,
        points: exercise.points,
      })),
  );
  const [visibleVocabularyCount, setVisibleVocabularyCount] = useState(
    VOCABULARY_PAGE_SIZE,
  );
  const [selectedVocabularyIds, setSelectedVocabularyIds] = useState<
    string[]
  >([]);
  const [removedVocabularyIds, setRemovedVocabularyIds] = useState<string[]>(
    [],
  );
  const removedVocabularyIdSet = new Set(removedVocabularyIds);
  const availableVocabulary = lesson.vocabulary.filter(
    (item) => !removedVocabularyIdSet.has(item.id),
  );
  const visibleVocabulary = availableVocabulary.slice(
    0,
    visibleVocabularyCount,
  );
  const remainingVocabularyCount = Math.max(
    availableVocabulary.length - visibleVocabularyCount,
    0,
  );
  const nextVocabularyCount = Math.min(
    VOCABULARY_PAGE_SIZE,
    remainingVocabularyCount,
  );

  return (
    <form action={action} className="space-y-7">
      <input type="hidden" name="contentId" value={lesson.id} />
      <input
        type="hidden"
        name="dictationsJson"
        value={JSON.stringify(dictations)}
      />
      <input
        type="hidden"
        name="translationsJson"
        value={JSON.stringify(translations)}
      />
      <input type="hidden" name="grammarJson" value={JSON.stringify(grammar)} />
      <input
        type="hidden"
        name="grammarExercisesJson"
        value={JSON.stringify(
          grammarExercises.map((exercise, index) => ({
            ...exercise,
            id:
              exercise.id ||
              `${lesson.id}-grammar-exercise-hotfix-${String(index + 1).padStart(3, "0")}`,
            points: exercise.points ?? 1,
          })),
        )}
      />
      <input
        type="hidden"
        name="removedVocabularyIdsJson"
        value={JSON.stringify(removedVocabularyIds)}
      />
      {state.message && (
        <p role="alert" className="rounded-2xl bg-red-50 p-4 font-bold text-red-700">
          {state.message}
        </p>
      )}

      <div className="mx-auto flex w-full max-w-md rounded-3xl border-2 border-sky-200 bg-sky-50 p-2 shadow-sm" role="tablist" aria-label="Khu vực hotfix">
        {([
          ["vocabulary", "Từ vựng"],
          ["grammar", "Ngữ pháp"],
        ] as const).map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className={`min-h-14 flex-1 rounded-2xl px-5 py-3 text-lg font-black transition ${
              activeTab === tab
                ? "bg-gradient-to-r from-sky-600 to-cyan-500 text-white shadow-lg shadow-sky-200"
                : "text-ink-600 hover:bg-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className={activeTab === "vocabulary" ? "space-y-7" : "hidden"}>

      <section className="rounded-3xl border bg-white p-6">
        <h2 className="text-2xl font-black">Nội dung hiển thị</h2>
        <p className="mt-2 text-sm text-ink-600">
          Chỉ dùng cho lỗi nhỏ. Thay đổi cấu trúc lớn nên tạo phiên bản mới.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="font-black">
            Tên tiếng Việt
            <input name="titleVi" defaultValue={lesson.title.vi} className={fieldClass} />
          </label>
          <label className="font-black">
            Tên tiếng Hàn
            <input name="titleKo" defaultValue={lesson.title.ko} lang="ko" className={fieldClass} />
          </label>
        </div>
        <label className="mt-4 block font-black">
          Mô tả bài học
          <textarea name="summary" defaultValue={lesson.summary} rows={3} className={fieldClass} />
        </label>
      </section>

      <section className="rounded-3xl border border-violet-200 bg-violet-50 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black">Audio câu chính tả</h2>
            <p className="mt-2 text-sm leading-6 text-ink-600">
              Tạo audio Azure một lần cho từng câu. File được cache trên Supabase CDN
              và chỉ được đưa tới learner sau khi áp dụng hotfix.
            </p>
            {dictations.length === MAX_DICTATION_COUNT && (
              <span className="mt-3 inline-flex rounded-full bg-violet-600 px-3 py-1 text-xs font-black text-white">
                Đã đủ 15/15
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {dictationExpanded && (
              <button
                type="button"
                disabled={dictations.length >= MAX_DICTATION_COUNT}
                onClick={() =>
                  setDictations((items) => [
                    ...items,
                    {
                      id: `${lesson.id}-dictation-hotfix-${crypto.randomUUID()}`,
                      sentence: "",
                      audioUrl: undefined,
                      acceptedAnswers: [],
                      points: 1,
                    },
                  ])
                }
                className="rounded-full bg-violet-600 px-5 py-3 font-black text-white shadow-md transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                + Thêm câu chính tả
              </button>
            )}
            <button
              type="button"
              aria-expanded={dictationExpanded}
              onClick={() => setDictationExpanded((value) => !value)}
              className="rounded-full border border-violet-300 bg-white px-5 py-3 font-black text-violet-800 hover:bg-violet-100"
            >
              {dictationExpanded ? "Thu gọn ↑" : `Mở rộng (${dictations.length}) ↓`}
            </button>
          </div>
        </div>
        {dictationExpanded && <div>
          <p className="mt-2 text-sm leading-6 text-ink-600">
            {dictations.length === MAX_DICTATION_COUNT
              ? "Đã đủ 15/15"
              : `${dictations.length}/${MAX_DICTATION_COUNT} câu chính tả`}
          </p>
          <div className="mt-5 space-y-3">
          {dictations.length === 0 && (
            <div className="rounded-2xl border border-dashed border-violet-300 bg-white/80 p-6 text-center">
              <p className="font-black text-ink-900">Chưa có câu chính tả</p>
              <p className="mt-1 text-sm text-ink-600">
                Bấm “Thêm câu chính tả” để tạo câu đầu tiên cho bài này.
              </p>
            </div>
          )}
          {dictations.map((exercise, index) => (
            <article key={exercise.id} className="rounded-2xl border bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-black uppercase text-violet-600">
                  Câu {index + 1}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setDictations((items) =>
                      items.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                  className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-black text-red-700 hover:bg-red-100"
                  aria-label={`Xóa câu chính tả ${index + 1}`}
                >
                  Xóa câu
                </button>
              </div>
              <input
                lang="ko"
                value={exercise.sentence}
                onChange={(event) =>
                  setDictations((items) =>
                    items.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, sentence: event.target.value, audioUrl: undefined }
                        : item,
                    ),
                  )
                }
                className={fieldClass}
              />
              <label className="mt-3 block text-sm font-black">
                Đáp án chấp nhận thêm — mỗi dòng một đáp án
                <textarea
                  lang="ko"
                  rows={2}
                  value={exercise.acceptedAnswers.join("\n")}
                  onChange={(event) =>
                    setDictations((items) =>
                      items.map((item, itemIndex) =>
                        itemIndex === index
                          ? {
                              ...item,
                              acceptedAnswers: event.target.value
                                .split("\n")
                                .map((answer) => answer.trim())
                                .filter(Boolean),
                            }
                          : item,
                      ),
                    )
                  }
                  className={fieldClass}
                />
              </label>
              <div className="mt-3">
                <SentenceAudioButton
                  text={exercise.sentence}
                  currentAudioUrl={exercise.audioUrl}
                  onGenerated={(audioUrl) =>
                    setDictations((items) =>
                      items.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, audioUrl } : item,
                      ),
                    )
                  }
                />
              </div>
            </article>
          ))}
          </div>
        </div>
        }
      </section>

      <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black">Dịch câu</h2>
            <p className="mt-2 text-sm leading-6 text-ink-600">
              Chỉnh câu tiếng Việt, câu tiếng Hàn và đáp án được chấp nhận theo cả hai chiều.
            </p>
            {translations.length === MAX_TRANSLATION_COUNT && (
              <span className="mt-3 inline-flex rounded-full bg-emerald-600 px-3 py-1 text-xs font-black text-white">
                Đã đủ 15/15
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {translationExpanded && (
              <button
                type="button"
                disabled={translations.length >= MAX_TRANSLATION_COUNT}
                onClick={() =>
                  setTranslations((items) => [
                    ...items,
                    {
                      id: `${lesson.id}-translation-hotfix-${crypto.randomUUID()}`,
                      vietnamese: "",
                      korean: "",
                      acceptedVietnameseAnswers: [],
                      acceptedKoreanAnswers: [],
                      points: 1,
                    },
                  ])
                }
                className="rounded-full bg-emerald-600 px-5 py-3 font-black text-white shadow-md transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                + Thêm câu dịch
              </button>
            )}
            <button
              type="button"
              aria-expanded={translationExpanded}
              onClick={() => setTranslationExpanded((value) => !value)}
              className="rounded-full border border-emerald-300 bg-white px-5 py-3 font-black text-emerald-800 hover:bg-emerald-100"
            >
              {translationExpanded ? "Thu gọn ↑" : `Mở rộng (${translations.length}) ↓`}
            </button>
          </div>
        </div>

        {translationExpanded && (
          <div>
            <p className="mt-2 text-sm leading-6 text-ink-600">
              {translations.length === MAX_TRANSLATION_COUNT
                ? "Đã đủ 15/15"
                : `${translations.length}/${MAX_TRANSLATION_COUNT} câu dịch`}
            </p>
            <div className="mt-5 space-y-3">
              {translations.length === 0 && (
                <div className="rounded-2xl border border-dashed border-emerald-300 bg-white/80 p-6 text-center">
                  <p className="font-black text-ink-900">Chưa có câu dịch</p>
                  <p className="mt-1 text-sm text-ink-600">
                    Bấm “Thêm câu dịch” để tạo câu đầu tiên cho chế độ Dịch câu.
                  </p>
                </div>
              )}
              {translations.map((exercise, index) => (
                <article key={exercise.id} className="rounded-2xl border bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-black uppercase text-emerald-700">
                      Câu {index + 1}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        setTranslations((items) =>
                          items.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                      className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-black text-red-700 hover:bg-red-100"
                      aria-label={`Xóa câu dịch ${index + 1}`}
                    >
                      Xóa câu
                    </button>
                  </div>
                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    <label className="text-sm font-black">
                      Câu tiếng Việt
                      <textarea
                        rows={2}
                        value={exercise.vietnamese}
                        onChange={(event) =>
                          setTranslations((items) =>
                            items.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, vietnamese: event.target.value }
                                : item,
                            ),
                          )
                        }
                        className={fieldClass}
                      />
                    </label>
                    <label className="text-sm font-black">
                      Câu tiếng Hàn
                      <textarea
                        lang="ko"
                        rows={2}
                        value={exercise.korean}
                        onChange={(event) =>
                          setTranslations((items) =>
                            items.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, korean: event.target.value }
                                : item,
                            ),
                          )
                        }
                        className={fieldClass}
                      />
                    </label>
                    <label className="text-sm font-black">
                      Đáp án tiếng Việt khác — mỗi dòng một đáp án
                      <textarea
                        rows={2}
                        value={exercise.acceptedVietnameseAnswers.join("\n")}
                        onChange={(event) =>
                          setTranslations((items) =>
                            items.map((item, itemIndex) =>
                              itemIndex === index
                                ? {
                                    ...item,
                                    acceptedVietnameseAnswers: event.target.value
                                      .split("\n")
                                      .map((answer) => answer.trim())
                                      .filter(Boolean),
                                  }
                                : item,
                            ),
                          )
                        }
                        className={fieldClass}
                      />
                    </label>
                    <label className="text-sm font-black">
                      Đáp án tiếng Hàn khác — mỗi dòng một đáp án
                      <textarea
                        lang="ko"
                        rows={2}
                        value={exercise.acceptedKoreanAnswers.join("\n")}
                        onChange={(event) =>
                          setTranslations((items) =>
                            items.map((item, itemIndex) =>
                              itemIndex === index
                                ? {
                                    ...item,
                                    acceptedKoreanAnswers: event.target.value
                                      .split("\n")
                                      .map((answer) => answer.trim())
                                      .filter(Boolean),
                                  }
                                : item,
                            ),
                          )
                        }
                        className={fieldClass}
                      />
                    </label>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-sky-200 bg-sky-50 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black">Ảnh, nội dung và audio từ vựng</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-600">
              Mở riêng từng từ để sửa lỗi nhỏ, hoặc chọn các từ cần gỡ khỏi bài.
              Gỡ khỏi bài không xóa từ trong Thư viện từ dùng chung.
            </p>
          </div>
          <span className="rounded-full border border-sky-200 bg-white px-4 py-2 text-sm font-black text-sky-800">
            {availableVocabulary.length} từ trong bài
          </span>
        </div>

        {availableVocabulary.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-200 bg-white p-3 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setSelectedVocabularyIds(
                    availableVocabulary.map((item) => item.id),
                  )
                }
                className="rounded-xl border-2 border-sky-200 bg-sky-50 px-4 py-2 text-sm font-black text-sky-800 transition hover:border-sky-400"
              >
                Chọn tất cả {availableVocabulary.length} từ
              </button>
              {selectedVocabularyIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedVocabularyIds([])}
                  className="rounded-xl px-4 py-2 text-sm font-black text-slate-600 transition hover:bg-slate-100"
                >
                  Bỏ chọn
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <strong className="text-sm text-sky-900">
                Đã chọn {selectedVocabularyIds.length} từ
              </strong>
              <button
                type="button"
                disabled={selectedVocabularyIds.length === 0}
                onClick={() => {
                  const count = selectedVocabularyIds.length;
                  const removingAll = count === availableVocabulary.length;
                  const confirmation = removingAll
                    ? `Gỡ toàn bộ ${count} từ khỏi bài đang phát hành? Các từ vẫn còn trong Thư viện từ.`
                    : `Gỡ ${count} từ đã chọn khỏi bài đang phát hành? Các từ vẫn còn trong Thư viện từ.`;
                  if (!window.confirm(confirmation)) return;
                  setRemovedVocabularyIds((items) => [
                    ...new Set([...items, ...selectedVocabularyIds]),
                  ]);
                  setSelectedVocabularyIds([]);
                }}
                className="rounded-xl border-2 border-red-200 bg-red-50 px-4 py-2 text-sm font-black text-red-700 transition hover:border-red-400 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Gỡ khỏi bài
              </button>
            </div>
          </div>
        )}

        {removedVocabularyIds.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
            <p className="font-bold">
              Đã đánh dấu gỡ {removedVocabularyIds.length} từ. Nhập lý do và
              bấm “Áp dụng hotfix” để cập nhật cho người học.
            </p>
            <button
              type="button"
              onClick={() => {
                setRemovedVocabularyIds([]);
                setVisibleVocabularyCount(VOCABULARY_PAGE_SIZE);
              }}
              className="rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-black text-amber-900"
            >
              Hoàn tác
            </button>
          </div>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {visibleVocabulary.map((item, index) => (
            <article
              key={item.id}
              className={`flex items-start gap-3 rounded-2xl border-2 bg-white p-4 transition ${
                selectedVocabularyIds.includes(item.id)
                  ? "border-sky-500 bg-sky-100/70 shadow-sm"
                  : "border-white hover:border-sky-300"
              }`}
            >
              <label className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-xl border border-sky-200 bg-sky-50">
                <span className="sr-only">Chọn từ {item.korean}</span>
                <input
                  type="checkbox"
                  checked={selectedVocabularyIds.includes(item.id)}
                  onChange={(event) =>
                    setSelectedVocabularyIds((items) =>
                      event.target.checked
                        ? [...new Set([...items, item.id])]
                        : items.filter((id) => id !== item.id),
                    )
                  }
                  className="h-5 w-5 accent-sky-600"
                />
              </label>
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-3">
                  <Link
                    href={`/quan-tri/hotfix/${lesson.id}/tu-vung/${item.id}`}
                    className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-4"
                  >
                    <span className="min-w-0">
                      <strong lang="ko" className="block truncate text-xl">
                        {item.korean}
                      </strong>
                      <span className="mt-1 block truncate text-sm font-bold text-orange-700">
                        {item.vietnamese}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-black text-sky-700">
                      Từ {index + 1} →
                    </span>
                  </Link>
                  <VocabularyListAudioButton
                    vocabularyId={item.id}
                    currentAudioUrl={item.audioUrl}
                  />
                </div>

                <div className="mt-3 space-y-2 border-t border-sky-100 pt-3">
                  {item.examples.length > 0 ? (
                    item.examples.map((example, exampleIndex) => (
                      <div
                        key={example.id}
                        className="flex flex-col gap-2 rounded-xl bg-slate-50 px-3 py-2 sm:flex-row sm:items-center"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-black uppercase tracking-wide text-sky-700">
                            Ví dụ {exampleIndex + 1}
                          </p>
                          <p lang="ko" className="mt-0.5 text-sm font-bold text-ink-900">
                            {example.korean}
                          </p>
                          <p className="mt-0.5 text-xs font-semibold text-ink-600">
                            {example.vietnamese}
                          </p>
                        </div>
                        <VocabularyExampleAudioButton
                          vocabularyId={item.id}
                          exampleId={example.id}
                          currentAudioUrl={example.audioUrl}
                        />
                      </div>
                    ))
                  ) : (
                    <p className="text-xs font-semibold text-slate-500">
                      Chưa có câu ví dụ. Mở “Từ {index + 1}” để thêm câu.
                    </p>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
        {availableVocabulary.length === 0 && (
          <div className="mt-5 rounded-2xl border border-dashed border-amber-300 bg-white p-6 text-center">
            <p className="font-black text-amber-950">
              Toàn bộ từ đã được đánh dấu gỡ khỏi bài.
            </p>
            <p className="mt-1 text-sm text-amber-800">
              Các từ vẫn an toàn trong Thư viện từ và chưa bị gỡ cho đến khi
              bạn áp dụng hotfix.
            </p>
          </div>
        )}
        {remainingVocabularyCount > 0 && (
          <div className="mt-6 rounded-3xl border border-sky-200 bg-white/80 p-4 text-center shadow-sm">
            <p className="text-sm font-bold text-ink-600">
              Đang hiển thị {visibleVocabulary.length}/{availableVocabulary.length} từ
            </p>
            <button
              type="button"
              onClick={() =>
                setVisibleVocabularyCount((count) =>
                  Math.min(
                    count + VOCABULARY_PAGE_SIZE,
                    availableVocabulary.length,
                  ),
                )
              }
              className="mt-3 inline-flex min-h-12 items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-sky-600 to-cyan-500 px-6 py-3 font-black text-white shadow-lg shadow-sky-200 transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-white/20 text-lg">
                ↓
              </span>
              Hiển thị thêm {nextVocabularyCount} từ
              <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs">
                Còn {remainingVocabularyCount}
              </span>
            </button>
          </div>
        )}
        {remainingVocabularyCount === 0 &&
          availableVocabulary.length > VOCABULARY_PAGE_SIZE && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() =>
                  setVisibleVocabularyCount(VOCABULARY_PAGE_SIZE)
                }
                className="inline-flex min-h-11 items-center gap-2 rounded-2xl border-2 border-sky-200 bg-white px-5 py-2.5 font-black text-sky-800 transition hover:border-sky-400 hover:bg-sky-50"
              >
                ↑ Thu gọn còn 30 từ
              </button>
            </div>
          )}
      </section>

      </div>

      <div className={activeTab === "grammar" ? "space-y-7" : "hidden"}>
        <section className="rounded-3xl border border-violet-200 bg-violet-50 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-700">
                Nội dung ngữ pháp đang phát hành
              </p>
              <h2 className="mt-2 text-2xl font-black">Điểm ngữ pháp và audio ví dụ</h2>
              <p className="mt-2 max-w-3xl leading-7 text-ink-600">
                Sửa cấu trúc, công thức, giải thích và câu ví dụ. Khi đổi câu
                tiếng Hàn, hãy tạo lại audio Azure trước khi áp dụng hotfix.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const pointNumber = grammar.length + 1;
                setGrammar((items) => [
                  ...items,
                  {
                    id: `${lesson.id}-grammar-hotfix-${String(pointNumber).padStart(3, "0")}`,
                    title: "",
                    form: "",
                    explanation: "",
                    formula: "",
                    examples: [
                      {
                        id: `${lesson.id}-grammar-hotfix-${String(pointNumber).padStart(3, "0")}-example-001`,
                        korean: "",
                        vietnamese: "",
                        audioUrl: undefined,
                      },
                    ],
                  },
                ]);
              }}
              className="rounded-2xl bg-violet-700 px-5 py-3 font-black text-white shadow-sm transition hover:-translate-y-0.5"
            >
              + Thêm điểm ngữ pháp
            </button>
          </div>

          <div className="mt-6 space-y-5">
            {grammar.map((point, pointIndex) => (
              <article key={point.id} className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-black">Điểm ngữ pháp {pointIndex + 1}</h3>
                  <button
                    type="button"
                    onClick={() => setGrammar((items) => items.filter((_, index) => index !== pointIndex))}
                    className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-black text-red-700"
                  >
                    Xóa điểm này
                  </button>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {([
                    ["title", "Tên dễ hiểu"],
                    ["form", "Cấu trúc tiếng Hàn"],
                    ["formula", "Công thức"],
                  ] as const).map(([field, label]) => (
                    <label key={field} className="font-black">
                      {label}
                      <input
                        lang={field === "form" ? "ko" : undefined}
                        value={point[field]}
                        onChange={(event) =>
                          setGrammar((items) => items.map((item, index) =>
                            index === pointIndex ? { ...item, [field]: event.target.value } : item,
                          ))
                        }
                        className={fieldClass}
                      />
                    </label>
                  ))}
                </div>
                <label className="mt-4 block font-black">
                  Giải thích bằng tiếng Việt
                  <textarea
                    rows={4}
                    value={point.explanation}
                    onChange={(event) => setGrammar((items) => items.map((item, index) =>
                      index === pointIndex ? { ...item, explanation: event.target.value } : item,
                    ))}
                    className={fieldClass}
                  />
                </label>

                <div className="mt-5 flex items-center justify-between gap-3">
                  <h4 className="font-black">Câu ví dụ</h4>
                  <button
                    type="button"
                    onClick={() => setGrammar((items) => items.map((item, index) => {
                      if (index !== pointIndex) return item;
                      const exampleNumber = item.examples.length + 1;
                      return {
                        ...item,
                        examples: [...item.examples, {
                          id: `${item.id}-example-hotfix-${String(exampleNumber).padStart(3, "0")}`,
                          korean: "",
                          vietnamese: "",
                          audioUrl: undefined,
                        }],
                      };
                    }))}
                    className="text-sm font-black text-violet-700"
                  >
                    + Thêm câu ví dụ
                  </button>
                </div>
                <div className="mt-3 space-y-3">
                  {point.examples.map((example, exampleIndex) => (
                    <div key={example.id} className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
                      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                        <input
                          lang="ko"
                          aria-label={`Câu ví dụ tiếng Hàn ${exampleIndex + 1}`}
                          value={example.korean}
                          onChange={(event) => setGrammar((items) => items.map((item, index) =>
                            index === pointIndex ? {
                              ...item,
                              examples: item.examples.map((entry, entryIndex) =>
                                entryIndex === exampleIndex
                                  ? { ...entry, korean: event.target.value, audioUrl: undefined }
                                  : entry,
                              ),
                            } : item,
                          ))}
                          placeholder="저는 학생이에요."
                          className={fieldClass}
                        />
                        <input
                          aria-label={`Nghĩa câu ví dụ ${exampleIndex + 1}`}
                          value={example.vietnamese}
                          onChange={(event) => setGrammar((items) => items.map((item, index) =>
                            index === pointIndex ? {
                              ...item,
                              examples: item.examples.map((entry, entryIndex) =>
                                entryIndex === exampleIndex
                                  ? { ...entry, vietnamese: event.target.value }
                                  : entry,
                              ),
                            } : item,
                          ))}
                          placeholder="Tôi là học sinh."
                          className={fieldClass}
                        />
                        <button
                          type="button"
                          aria-label={`Xóa câu ví dụ ${exampleIndex + 1}`}
                          onClick={() => setGrammar((items) => items.map((item, index) =>
                            index === pointIndex
                              ? { ...item, examples: item.examples.filter((_, entryIndex) => entryIndex !== exampleIndex) }
                              : item,
                          ))}
                          className="mt-2 rounded-xl border border-red-200 bg-white px-4 font-black text-red-700"
                        >
                          ×
                        </button>
                      </div>
                      <div className="mt-3">
                        <SentenceAudioButton
                          text={example.korean}
                          currentAudioUrl={example.audioUrl}
                          onGenerated={(audioUrl) => setGrammar((items) => items.map((item, index) =>
                            index === pointIndex ? {
                              ...item,
                              examples: item.examples.map((entry, entryIndex) =>
                                entryIndex === exampleIndex ? { ...entry, audioUrl } : entry,
                              ),
                            } : item,
                          ))}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <GrammarExerciseImport
          exercises={grammarExercises}
          onChange={(items) => setGrammarExercises(items)}
        />
      </div>

      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
        <label className="font-black text-amber-950">
          Lý do hotfix
          <textarea
            name="reason"
            required
            rows={2}
            placeholder="Ví dụ: Thay audio chính tả cũ bằng giọng Azure."
            className={fieldClass}
          />
        </label>
        <p className="mt-3 text-sm font-semibold text-amber-900">
          Thao tác này cập nhật ngay bài đang phát hành và được ghi vào lịch sử hệ thống.
        </p>
      </section>

      <button
        disabled={pending}
        className="w-full rounded-2xl bg-violet-700 px-6 py-4 text-lg font-black text-white disabled:opacity-60"
      >
        {pending ? "Đang áp dụng…" : "Áp dụng hotfix cho người học"}
      </button>
    </form>
  );
}
