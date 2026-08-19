"use client";

import { useEffect, useRef, useState } from "react";
import type { Exercise, GrammarPoint } from "@/content/schema";
import { isAcceptedAnswer } from "@/lib/learning-core/answers";

type FillBlankExercise = Extract<Exercise, { type: "fill-blank" }>;

type GrammarSectionProps = {
  lessonId: string;
  grammar: readonly GrammarPoint[];
  exercises: readonly FillBlankExercise[];
  onSpeak: (text: string, audioUrl?: string) => void;
  onFeedback: (correct: boolean) => void;
  onComplete?: (score: number, total: number) => void;
};

export function GrammarSection({
  grammar,
  exercises,
  onSpeak,
  onFeedback,
  onComplete,
}: GrammarSectionProps) {
  const [answers, setAnswers] = useState(() => exercises.map(() => ""));
  const [results, setResults] = useState<Array<boolean | null>>(() =>
    exercises.map(() => null),
  );

  const completed = exercises.every((_, index) => results[index] !== null);
  const completionReported = useRef(false);

  useEffect(() => {
    if (!completed) {
      completionReported.current = false;
      return;
    }
    if (completionReported.current) return;
    completionReported.current = true;
    onComplete?.(
      results.filter((result) => result === true).length,
      exercises.length,
    );
  }, [completed, exercises.length, onComplete, results]);

  function checkAnswer(index: number) {
    const answer = answers[index] ?? "";
    if (!answer.trim()) return;

    const correct = isAcceptedAnswer(
      answer,
      exercises[index].acceptedAnswers,
    );
    setResults((items) =>
      items.map((item, itemIndex) => (itemIndex === index ? correct : item)),
    );
    onFeedback(correct);
  }

  function updateAnswer(index: number, value: string) {
    setAnswers((items) =>
      exercises.map((_, itemIndex) =>
        itemIndex === index ? value : (items[itemIndex] ?? ""),
      ),
    );
    setResults((items) =>
      exercises.map((_, itemIndex) =>
        itemIndex === index ? null : (items[itemIndex] ?? null),
      ),
    );
  }

  function reset() {
    setAnswers(exercises.map(() => ""));
    setResults(exercises.map(() => null));
  }

  return (
    <section className="mt-7 space-y-6 pb-14">
      {grammar.map((item, index) => (
        <article
          key={item.id}
          className="overflow-hidden rounded-3xl border border-white bg-white/95 shadow-[0_16px_35px_rgba(16,36,62,0.13)]"
        >
          <div className="bg-gradient-to-br from-blue-100/90 via-cyan-50/80 to-white p-6 md:p-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="inline-flex rounded-full border border-blue-300 bg-gradient-to-r from-blue-600 to-sky-500 px-5 py-2.5 text-sm font-black uppercase tracking-widest text-white shadow-[0_8px_18px_rgba(37,99,235,0.24)]">
                  Cấu trúc {index + 1}
                </p>
                <h3
                  lang="ko"
                  className="font-korean mt-4 text-5xl font-black text-[#10243e]"
                >
                  {item.form}
                </h3>
                <p className="mt-1 text-xl font-bold text-blue-800/65">
                  {item.title}
                </p>
              </div>
              <div className="rounded-2xl border-2 border-blue-200 bg-white px-5 py-4 text-center text-lg font-black text-blue-900 shadow-sm">
                {item.formula}
              </div>
            </div>
            <p className="mt-6 text-lg leading-8 text-[#344b67]">
              {item.explanation}
            </p>
          </div>
          <div className="border-t border-blue-100 p-6 md:p-8">
            <h4 className="inline-flex rounded-xl border border-blue-300 bg-blue-100 px-4 py-2 text-xl font-black text-blue-900 shadow-sm">
              Ví dụ
            </h4>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {item.examples.map((example) => (
                <div
                  key={example.id}
                  className="rounded-2xl border border-blue-200/80 bg-blue-50/75 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-[0_10px_22px_rgba(37,99,235,0.14)]"
                >
                  <div className="flex gap-3">
                    <p
                      lang="ko"
                      className="font-korean flex-1 text-xl font-black text-[#10243e]"
                    >
                      {example.korean}
                    </p>
                    <button
                      type="button"
                      onClick={() => onSpeak(example.korean, example.audioUrl)}
                      disabled={!example.audioUrl}
                      aria-label={example.audioUrl ? `Phát âm ${example.korean}` : `Chưa có audio Azure cho ${example.korean}`}
                      className="disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      🔊
                    </button>
                  </div>
                  <p className="mt-2 text-lg font-semibold leading-7 text-[#344b67]">
                    {example.vietnamese}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </article>
      ))}

      <article className="rounded-3xl border border-white bg-white/95 p-6 shadow-[0_16px_35px_rgba(16,36,62,0.14)] md:p-9">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="inline-flex rounded-full border border-cyan-300 bg-gradient-to-r from-[#087eba] to-cyan-500 px-6 py-3 text-xl font-black uppercase tracking-[0.12em] text-white shadow-[0_10px_22px_rgba(8,126,186,0.24)]">
              Luyện tập · {exercises.length} câu
            </p>
            <h3 className="mt-5 text-3xl font-black">Điền phần còn thiếu</h3>
            <p className="mt-3 text-lg font-semibold text-[#344b67]">
              Nhập phần ngữ pháp phù hợp vào chỗ trống.
            </p>
          </div>
          {completed && (
            <button
              type="button"
              onClick={reset}
              className="rounded-xl border-2 border-sky-300 bg-white px-5 py-3 font-black text-[#087eba] transition hover:-translate-y-1 hover:bg-sky-50"
            >
              ↻ Làm lại
            </button>
          )}
        </div>

        <div className="mt-7 space-y-4">
          {exercises.map((exercise, index) => (
            <div
              key={exercise.id}
              className={`rounded-2xl border-2 p-5 transition ${
                results[index] === true
                  ? "border-emerald-400 bg-emerald-50"
                  : results[index] === false
                    ? "border-red-400 bg-red-50"
                    : "border-blue-100 bg-[#f7fbff]"
              }`}
            >
              <p className="text-lg font-bold text-[#52637a]">
                Câu {index + 1} · {exercise.translation}
              </p>
              <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center">
                <p
                  lang="ko"
                  className="font-korean min-w-0 flex-1 text-xl font-black text-[#10243e]"
                >
                  {exercise.prompt}
                </p>
                <input
                  value={answers[index] ?? ""}
                  lang="ko"
                  disabled={results[index] === true}
                  onChange={(event) => updateAnswer(index, event.target.value)}
                  onKeyDown={(event) =>
                    event.key === "Enter" && checkAnswer(index)
                  }
                  placeholder="Nhập đáp án"
                  className="rounded-xl border-2 border-sky-200 bg-white px-4 py-3 text-center text-lg font-black outline-none focus:border-sky-500 focus:ring-4 focus:ring-blue-200 md:w-44"
                />
                <button
                  type="button"
                  onClick={() => checkAnswer(index)}
                  className="rounded-xl bg-gradient-to-r from-[#087eba] to-sky-500 px-5 py-3 font-black text-white shadow-[0_8px_18px_rgba(8,126,186,0.22)] transition hover:-translate-y-1 hover:shadow-lg active:translate-y-0"
                >
                  Kiểm tra
                </button>
              </div>
              {results[index] !== null && (
                <p
                  aria-live="polite"
                  className={`mt-3 font-black ${
                    results[index] ? "text-emerald-700" : "text-red-700"
                  }`}
                >
                  {results[index]
                    ? "✓ Chính xác!"
                    : `✕ Chưa đúng. Gợi ý đáp án: ${exercise.acceptedAnswers.join(" / ")}`}
                </p>
              )}
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
