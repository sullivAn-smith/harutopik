"use client";

export type GrammarExerciseDraft = {
  prompt: string;
  translation: string;
  acceptedAnswers: string[];
};

const inputClass =
  "mt-2 w-full rounded-xl border-2 border-emerald-100 bg-white px-4 py-3 font-semibold outline-none transition focus:border-emerald-500";

function emptyExercise(): GrammarExerciseDraft {
  return { prompt: "", translation: "", acceptedAnswers: [""] };
}

export function GrammarExerciseImport({
  exercises,
  onChange,
}: {
  exercises: GrammarExerciseDraft[];
  onChange: (items: GrammarExerciseDraft[]) => void;
}) {
  function updateExercise(
    index: number,
    patch: Partial<GrammarExerciseDraft>,
  ) {
    onChange(
      exercises.map((exercise, exerciseIndex) =>
        exerciseIndex === index ? { ...exercise, ...patch } : exercise,
      ),
    );
  }

  function moveExercise(index: number, direction: -1 | 1) {
    const destination = index + direction;
    if (destination < 0 || destination >= exercises.length) return;
    const next = [...exercises];
    [next[index], next[destination]] = [next[destination], next[index]];
    onChange(next);
  }

  return (
    <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black">Luyện tập điền ngữ pháp</h2>
          <p className="mt-2 max-w-3xl leading-7 text-ink-600">
            Tạo từng câu trực tiếp. Trong câu tiếng Hàn, dùng dấu{" "}
            <strong>___</strong> tại vị trí người học cần điền.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange([...exercises, emptyExercise()])}
          className="rounded-xl bg-emerald-700 px-5 py-3 font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-800"
        >
          + Thêm câu luyện tập
        </button>
      </div>

      <div className="mt-5 space-y-4">
        {exercises.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-emerald-300 bg-white/80 px-5 py-8 text-center">
            <p className="font-black text-ink-700">Chưa có câu luyện tập</p>
            <p className="mt-1 text-sm text-ink-500">
              Bấm “Thêm câu luyện tập” để tạo câu đầu tiên.
            </p>
          </div>
        ) : (
          exercises.map((exercise, index) => (
            <article
              key={index}
              className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="flex items-center gap-3 font-black">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-100 text-emerald-800">
                    {index + 1}
                  </span>
                  Câu luyện tập {index + 1}
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => moveExercise(index, -1)}
                    aria-label={`Đưa câu ${index + 1} lên trên`}
                    className="rounded-lg border px-3 py-1.5 font-black text-ink-600 disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={index === exercises.length - 1}
                    onClick={() => moveExercise(index, 1)}
                    aria-label={`Đưa câu ${index + 1} xuống dưới`}
                    className="rounded-lg border px-3 py-1.5 font-black text-ink-600 disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onChange(
                        exercises.filter(
                          (_, exerciseIndex) => exerciseIndex !== index,
                        ),
                      )
                    }
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 font-black text-red-700"
                  >
                    Xóa
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <label className="font-bold">
                  Câu tiếng Hàn có chỗ trống
                  <input
                    lang="ko"
                    value={exercise.prompt}
                    onChange={(event) =>
                      updateExercise(index, { prompt: event.target.value })
                    }
                    placeholder="저는 베트남 사람___."
                    className={inputClass}
                  />
                  <span className="mt-2 block text-xs font-semibold text-ink-500">
                    Ví dụ: 저는 베트남 사람___.
                  </span>
                </label>
                <label className="font-bold">
                  Nghĩa hoặc gợi ý tiếng Việt
                  <input
                    value={exercise.translation}
                    onChange={(event) =>
                      updateExercise(index, {
                        translation: event.target.value,
                      })
                    }
                    placeholder="Tôi là người Việt Nam."
                    className={inputClass}
                  />
                </label>
              </div>

              <label className="mt-4 block font-bold">
                Đáp án được chấp nhận
                <input
                  value={exercise.acceptedAnswers.join(" | ")}
                  onChange={(event) =>
                    updateExercise(index, {
                      acceptedAnswers: event.target.value
                        .split("|")
                        .map((answer) => answer.trim()),
                    })
                  }
                  placeholder="입니다 | 이에요"
                  className={inputClass}
                />
                <span className="mt-2 block text-xs font-semibold text-ink-500">
                  Nếu có nhiều đáp án đúng, ngăn cách bằng dấu <strong>|</strong>.
                </span>
              </label>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
