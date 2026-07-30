"use client";

export type TranslationExerciseDraft = {
  vietnamese: string;
  korean: string;
  acceptedVietnameseAnswers: string[];
  acceptedKoreanAnswers: string[];
};

const fieldClass =
  "mt-2 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 font-semibold outline-none focus:border-emerald-500";

function answersToText(answers: string[]) {
  return answers.join("\n");
}

function textToAnswers(value: string) {
  return value
    .split("\n")
    .map((answer) => answer.trim())
    .filter(Boolean);
}

export function TranslationExerciseEditor({
  exercises,
  onChange,
}: {
  exercises: TranslationExerciseDraft[];
  onChange: (exercises: TranslationExerciseDraft[]) => void;
}) {
  const reachedLimit = exercises.length >= 15;

  return (
    <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
            Luyện dịch hai chiều
          </p>
          <h2 className="mt-2 text-xl font-black">Câu dịch</h2>
          <p className="mt-2 leading-7 text-ink-600">
            Mỗi cặp được dùng cho cả Việt → Hàn và Hàn → Việt. Câu chính là đáp
            án chuẩn; chỉ nhập đáp án bổ sung khi có cách diễn đạt tương đương.
          </p>
        </div>
        <button
          type="button"
          disabled={reachedLimit}
          onClick={() =>
            onChange([
              ...exercises,
              {
                vietnamese: "",
                korean: "",
                acceptedVietnameseAnswers: [],
                acceptedKoreanAnswers: [],
              },
            ])
          }
          className="rounded-xl bg-gradient-to-r from-emerald-700 to-teal-500 px-4 py-2.5 font-black text-white shadow-md transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {reachedLimit ? "Đã đủ 15 câu" : "+ Thêm câu dịch"}
        </button>
      </div>
      <p className="mt-3 text-sm font-bold text-emerald-800">
        {exercises.length}/15 câu dịch
      </p>

      {exercises.length === 0 ? (
        <div className="mt-5 rounded-2xl border-2 border-dashed border-emerald-200 bg-white/70 p-8 text-center">
          <p className="font-black">Chưa có câu dịch riêng</p>
          <p className="mt-2 text-sm text-ink-600">
            Bấm “Thêm câu dịch” để tạo cặp câu đầu tiên.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {exercises.map((exercise, index) => (
            <article
              key={index}
              className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-black text-emerald-900">
                  Câu dịch {index + 1}
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    onChange(
                      exercises.filter(
                        (_, exerciseIndex) => exerciseIndex !== index,
                      ),
                    )
                  }
                  className="rounded-lg px-3 py-1.5 text-sm font-black text-red-700 transition hover:bg-red-50"
                >
                  Xóa
                </button>
              </div>

              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <label className="font-bold">
                  Câu tiếng Việt — đáp án chuẩn
                  <textarea
                    rows={2}
                    value={exercise.vietnamese}
                    onChange={(event) =>
                      onChange(
                        exercises.map((item, exerciseIndex) =>
                          exerciseIndex === index
                            ? { ...item, vietnamese: event.target.value }
                            : item,
                        ),
                      )
                    }
                    placeholder="Tôi học tiếng Hàn mỗi ngày."
                    className={fieldClass}
                  />
                </label>
                <label className="font-bold">
                  Câu tiếng Hàn — đáp án chuẩn
                  <textarea
                    lang="ko"
                    rows={2}
                    value={exercise.korean}
                    onChange={(event) =>
                      onChange(
                        exercises.map((item, exerciseIndex) =>
                          exerciseIndex === index
                            ? { ...item, korean: event.target.value }
                            : item,
                        ),
                      )
                    }
                    placeholder="저는 매일 한국어를 공부해요."
                    className={fieldClass}
                  />
                </label>
                <label className="font-bold">
                  Đáp án tiếng Việt chấp nhận thêm
                  <textarea
                    rows={3}
                    value={answersToText(
                      exercise.acceptedVietnameseAnswers,
                    )}
                    onChange={(event) =>
                      onChange(
                        exercises.map((item, exerciseIndex) =>
                          exerciseIndex === index
                            ? {
                                ...item,
                                acceptedVietnameseAnswers: textToAnswers(
                                  event.target.value,
                                ),
                              }
                            : item,
                        ),
                      )
                    }
                    placeholder="Mỗi dòng một cách dịch tương đương"
                    className={fieldClass}
                  />
                </label>
                <label className="font-bold">
                  Đáp án tiếng Hàn chấp nhận thêm
                  <textarea
                    lang="ko"
                    rows={3}
                    value={answersToText(exercise.acceptedKoreanAnswers)}
                    onChange={(event) =>
                      onChange(
                        exercises.map((item, exerciseIndex) =>
                          exerciseIndex === index
                            ? {
                                ...item,
                                acceptedKoreanAnswers: textToAnswers(
                                  event.target.value,
                                ),
                              }
                            : item,
                        ),
                      )
                    }
                    placeholder="Mỗi dòng một cách viết tương đương"
                    className={fieldClass}
                  />
                </label>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
