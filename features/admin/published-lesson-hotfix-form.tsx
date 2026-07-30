"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { Lesson } from "@/content/schema";
import {
  applyPublishedLessonHotfix,
} from "./hotfix-actions";
import { SentenceAudioButton } from "./sentence-audio-button";

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
      {state.message && (
        <p role="alert" className="rounded-2xl bg-red-50 p-4 font-bold text-red-700">
          {state.message}
        </p>
      )}

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
