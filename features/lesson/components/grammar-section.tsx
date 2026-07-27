"use client";

import { useState } from "react";
import type { Exercise, GrammarPoint } from "@/content/schema";
import { isAcceptedAnswer } from "@/lib/learning-core/answers";

type FillBlankExercise = Extract<Exercise, { type: "fill-blank" }>;

type GrammarSectionProps = {
  grammar: readonly GrammarPoint[];
  exercises: readonly FillBlankExercise[];
  onSpeak: (text: string) => void;
  onFeedback: (correct: boolean) => void;
};

export function GrammarSection({
  grammar,
  exercises,
  onSpeak,
  onFeedback,
}: GrammarSectionProps) {
  const [answers, setAnswers] = useState(() => exercises.map(() => ""));
  const [results, setResults] = useState<Array<boolean | null>>(() =>
    exercises.map(() => null),
  );

  const completed = exercises.every((_, index) => results[index] !== null);

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
      <div className="rounded-3xl border border-white bg-white/95 p-6 shadow-[0_16px_35px_rgba(16,36,62,0.14)] md:p-9">
        <p className="inline-flex rounded-2xl border-2 border-blue-700 bg-blue-600 px-5 py-3 text-2xl font-black uppercase tracking-[0.12em] text-white shadow-[4px_4px_0_#10243e]">
          Ngữ pháp bài 1
        </p>
        <p className="mt-3 text-lg leading-8 text-[#52637a]">
          Ba cấu trúc nền tảng giúp bạn giới thiệu bản thân, hỏi thông tin và
          nêu chủ đề một cách lịch sự trong tiếng Hàn.
        </p>
      </div>

      {grammar.map((item, index) => (
        <article
          key={item.id}
          className="overflow-hidden rounded-3xl border border-white bg-white/95 shadow-[0_16px_35px_rgba(16,36,62,0.13)]"
        >
          <div className="bg-gradient-to-br from-blue-100/90 via-cyan-50/80 to-white p-6 md:p-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="inline-flex rounded-lg border-2 border-blue-800 bg-blue-600 px-4 py-2 text-sm font-black uppercase tracking-widest text-white shadow-[3px_3px_0_#10243e]">
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
                      onClick={() => onSpeak(example.korean)}
                      aria-label={`Phát âm ${example.korean}`}
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
            <p className="inline-flex rounded-2xl border-2 border-emerald-800 bg-emerald-600 px-5 py-3 text-xl font-black uppercase tracking-[0.12em] text-white shadow-[4px_4px_0_#10243e]">
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
              className="rounded-xl border-2 border-[#10243e] bg-blue-50 px-5 py-3 font-black transition hover:-translate-y-1 hover:bg-blue-100"
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
                  className="rounded-xl border-2 border-[#10243e] bg-white px-4 py-3 text-center text-lg font-black outline-none focus:ring-4 focus:ring-blue-200 md:w-44"
                />
                <button
                  type="button"
                  onClick={() => checkAnswer(index)}
                  className="rounded-xl bg-[#10243e] px-5 py-3 font-black text-white transition hover:-translate-y-1 hover:bg-blue-700 active:translate-y-0"
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
                    : "✕ Chưa đúng, hãy thử lại."}
                </p>
              )}
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
