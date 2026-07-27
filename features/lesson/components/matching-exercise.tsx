import type { VocabularyTuple } from "@/features/lesson/types";

type MatchingExerciseProps = {
  items: readonly VocabularyTuple[];
  meanings: readonly string[];
  startIndex: number;
  selectedIndex: number | null;
  matchedIndices: readonly number[];
  feedback: {
    selectedWord: string;
    chosenMeaning: string;
    correctMeaning: string;
    correct: boolean;
  } | null;
  reviewMode: boolean;
  isLastGroup: boolean;
  onSelectKorean: (index: number) => void;
  onSelectMeaning: (meaning: string) => void;
  onNextGroup: () => void;
};

function capitalizeFirst(value: string) {
  return value.charAt(0).toLocaleUpperCase("vi-VN") + value.slice(1);
}

export function MatchingExercise({
  items,
  meanings,
  startIndex,
  selectedIndex,
  matchedIndices,
  feedback,
  reviewMode,
  isLastGroup,
  onSelectKorean,
  onSelectMeaning,
  onNextGroup,
}: MatchingExerciseProps) {
  const completedCount = matchedIndices.filter(
    (index) => index >= startIndex && index < startIndex + items.length,
  ).length;
  const groupCompleted = completedCount === items.length;

  return (
    <section className="mt-7 rounded-3xl border-2 border-[#10243e] bg-white p-6 shadow-[6px_7px_0_#10243e] md:p-10">
      <p className="text-xs font-black uppercase tracking-widest text-blue-700">
        {reviewMode ? "Ôn lại câu sai" : "Nối từ"} · {items.length} từ mỗi lượt
      </p>
      <h2 className="mt-2 text-3xl font-black">
        Chọn từ Hàn rồi chọn nghĩa đúng
      </h2>
      <div className="mt-7 grid gap-5 md:grid-cols-2">
        <div className="space-y-3">
          {items.map((item, index) => {
            const absoluteIndex = startIndex + index;
            const matched = matchedIndices.includes(absoluteIndex);
            return (
              <button
                key={item[0]}
                type="button"
                disabled={matched}
                onClick={() => onSelectKorean(index)}
                className={`w-full rounded-2xl border-2 border-[#10243e] p-4 text-left text-xl font-black ${
                  matched
                    ? "bg-green-100 text-green-700 opacity-60"
                    : selectedIndex === index
                      ? "bg-blue-500 text-white"
                      : "bg-blue-50"
                }`}
              >
                <span lang="ko">{item[0]}</span>
              </button>
            );
          })}
        </div>
        <div className="space-y-3">
          {meanings.map((meaning) => {
            const itemIndex = items.findIndex((item) => item[1] === meaning);
            const absoluteIndex = startIndex + itemIndex;
            const matched = matchedIndices.includes(absoluteIndex);
            return (
              <button
                key={meaning}
                type="button"
                disabled={matched}
                onClick={() => onSelectMeaning(meaning)}
                className={`w-full rounded-2xl border-2 border-[#10243e] p-4 text-left font-bold ${
                  matched
                    ? "bg-green-100 text-green-700 opacity-60"
                    : feedback?.chosenMeaning === meaning && !feedback.correct
                      ? "bg-red-100 text-red-700"
                      : feedback?.correctMeaning === meaning &&
                          !feedback.correct
                        ? "bg-emerald-100 text-emerald-800"
                    : "bg-white hover:bg-blue-50"
                }`}
              >
                {capitalizeFirst(meaning)}
              </button>
            );
          })}
        </div>
      </div>
      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className={`mt-6 rounded-2xl border p-4 ${
            feedback.correct
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-red-200 bg-red-50 text-red-900"
          }`}
        >
          <p className="font-black">
            {feedback.correct ? "Chính xác!" : "Chưa đúng, thử lại nhé."}
          </p>
          {!feedback.correct && (
            <p className="mt-1 text-sm font-semibold">
              <span lang="ko">{feedback.selectedWord}</span> có nghĩa đúng là{" "}
              <strong>{capitalizeFirst(feedback.correctMeaning)}</strong>.
            </p>
          )}
        </div>
      )}
      {groupCompleted && (
        <div
          aria-live="polite"
          className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-green-100 p-4 font-bold text-green-800"
        >
          <span>Đã nối đúng cả {items.length} từ!</span>
          {!isLastGroup && (
            <button
              type="button"
              onClick={onNextGroup}
              className="rounded-xl bg-green-700 px-5 py-2.5 text-white"
            >
              Nhóm tiếp theo →
            </button>
          )}
        </div>
      )}
    </section>
  );
}
