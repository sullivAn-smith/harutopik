"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { Lesson } from "@/content/schema";
import {
  applyPublishedLessonHotfix,
} from "./hotfix-actions";
import { SentenceAudioButton } from "./sentence-audio-button";
import {
  GrammarExerciseImport,
  type GrammarExerciseDraft,
} from "./grammar-exercise-import";

const fieldClass =
  "mt-2 w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 font-semibold outline-none focus:border-violet-500";
const VOCABULARY_PAGE_SIZE = 30;

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
  const visibleVocabulary = lesson.vocabulary.slice(0, visibleVocabularyCount);
  const remainingVocabularyCount = Math.max(
    lesson.vocabulary.length - visibleVocabularyCount,
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
        <h2 className="text-2xl font-black">Audio câu chính tả</h2>
        <p className="mt-2 text-sm leading-6 text-ink-600">
          Tạo audio Azure một lần cho từng câu. File được cache trên Supabase CDN
          và chỉ được đưa tới learner sau khi áp dụng hotfix.
        </p>
        <div className="mt-5 space-y-3">
          {dictations.map((exercise, index) => (
            <article key={exercise.id} className="rounded-2xl border bg-white p-4">
              <p className="text-xs font-black uppercase text-violet-600">
                Câu {index + 1}
              </p>
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
      </section>

      <section className="rounded-3xl border border-sky-200 bg-sky-50 p-6">
        <h2 className="text-2xl font-black">Ảnh, nội dung và audio từ vựng</h2>
        <p className="mt-2 text-sm leading-6 text-ink-600">
          Mở riêng từng từ để sửa lỗi nhỏ, tải ảnh mới hoặc tạo lại audio Azure.
          Dữ liệu từ dùng chung sẽ cập nhật cho mọi bài đang sử dụng từ đó.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {visibleVocabulary.map((item, index) => (
            <Link
              key={item.id}
              href={`/quan-tri/hotfix/${lesson.id}/tu-vung/${item.id}`}
              className="flex items-center justify-between gap-3 rounded-2xl border bg-white p-4 transition hover:-translate-y-0.5 hover:border-sky-400"
            >
              <span>
                <strong lang="ko" className="block text-xl">{item.korean}</strong>
                <span className="mt-1 block text-sm font-bold text-orange-700">
                  {item.vietnamese}
                </span>
              </span>
              <span className="text-sm font-black text-sky-700">
                Từ {index + 1} →
              </span>
            </Link>
          ))}
        </div>
        {remainingVocabularyCount > 0 && (
          <div className="mt-6 rounded-3xl border border-sky-200 bg-white/80 p-4 text-center shadow-sm">
            <p className="text-sm font-bold text-ink-600">
              Đang hiển thị {visibleVocabulary.length}/{lesson.vocabulary.length} từ
            </p>
            <button
              type="button"
              onClick={() =>
                setVisibleVocabularyCount((count) =>
                  Math.min(
                    count + VOCABULARY_PAGE_SIZE,
                    lesson.vocabulary.length,
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
          lesson.vocabulary.length > VOCABULARY_PAGE_SIZE && (
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
