"use client";

import { SentenceAudioButton } from "@/features/admin/sentence-audio-button";

export type DictationExerciseDraft = {
  sentence: string;
  audioUrl?: string;
  acceptedAnswers: string[];
};

export function DictationExerciseEditor({
  exercises,
  onChange,
}: {
  exercises: DictationExerciseDraft[];
  onChange: (exercises: DictationExerciseDraft[]) => void;
}) {
  const reachedLimit = exercises.length >= 15;

  return (
    <section className="rounded-3xl border border-sky-200 bg-sky-50 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-700">
            Luyện nghe
          </p>
          <h2 className="mt-2 text-xl font-black">Câu chính tả</h2>
          <p className="mt-2 leading-7 text-ink-600">
            Nhập câu tiếng Hàn, tạo audio Azure và nghe thử. Người học chỉ nghe
            audio rồi viết lại câu; đáp án chỉ xuất hiện sau khi kiểm tra.
          </p>
        </div>
        <button
          type="button"
          disabled={reachedLimit}
          onClick={() =>
            onChange([...exercises, { sentence: "", acceptedAnswers: [] }])
          }
          className="rounded-xl bg-gradient-to-r from-[#087eba] to-sky-500 px-4 py-2.5 font-black text-white shadow-md transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {reachedLimit ? "Đã đủ 15 câu" : "+ Thêm câu chính tả"}
        </button>
      </div>
      <p className="mt-3 text-sm font-bold text-sky-800">
        {exercises.length}/15 câu chính tả
      </p>

      {exercises.length === 0 ? (
        <div className="mt-5 rounded-2xl border-2 border-dashed border-sky-200 bg-white/70 p-8 text-center">
          <p className="font-black">Chưa có câu chính tả riêng</p>
          <p className="mt-2 text-sm text-ink-600">
            Bấm “Thêm câu chính tả” để tạo câu nghe đầu tiên.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {exercises.map((exercise, index) => (
            <article
              key={index}
              className="rounded-2xl border border-sky-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-black text-sky-900">Câu {index + 1}</h3>
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
              <label className="mt-3 block font-bold">
                Câu tiếng Hàn — đáp án chuẩn
                <textarea
                  lang="ko"
                  rows={2}
                  value={exercise.sentence}
                  onChange={(event) =>
                    onChange(
                      exercises.map((item, exerciseIndex) =>
                        exerciseIndex === index
                          ? {
                              sentence: event.target.value,
                              audioUrl: undefined,
                              acceptedAnswers: item.acceptedAnswers,
                            }
                          : item,
                      ),
                    )
                  }
                  placeholder="저는 매일 한국어를 공부해요."
                  className="mt-2 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 font-semibold outline-none focus:border-sky-500"
                />
              </label>
              <label className="mt-3 block font-bold">
                Đáp án chấp nhận thêm — mỗi dòng một đáp án
                <textarea
                  lang="ko"
                  rows={2}
                  value={exercise.acceptedAnswers.join("\n")}
                  onChange={(event) =>
                    onChange(
                      exercises.map((item, exerciseIndex) =>
                        exerciseIndex === index
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
                  placeholder={
                    "Chỉ nhập khi có cách viết khác vẫn được coi là đúng.\nVí dụ: 저는 매일 한국어 공부를 해요."
                  }
                  className="mt-2 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 font-semibold outline-none focus:border-sky-500"
                />
                <span className="mt-2 block text-xs font-semibold text-ink-500">
                  Không cần nhập lại đáp án chuẩn phía trên.
                </span>
              </label>
              <div className="mt-3 rounded-xl bg-sky-50 p-3">
                <SentenceAudioButton
                  text={exercise.sentence}
                  currentAudioUrl={exercise.audioUrl}
                  onGenerated={(audioUrl) =>
                    onChange(
                      exercises.map((item, exerciseIndex) =>
                        exerciseIndex === index
                          ? { ...item, audioUrl }
                          : item,
                      ),
                    )
                  }
                />
                {!exercise.audioUrl && exercise.sentence.trim() && (
                  <p className="mt-2 text-xs font-bold text-amber-700">
                    Chưa có audio. Hãy bấm “Tạo Azure” trước khi gửi duyệt.
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
