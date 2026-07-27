import type { VocabularyTuple } from "@/features/lesson/types";

type QuizExerciseProps = {
  word: VocabularyTuple;
  options: readonly string[];
  selectedAnswer: string | null;
  score: string;
  isLastQuestion: boolean;
  onAnswer: (answer: string) => void;
  onNext: () => void;
};

function capitalizeFirst(value: string) {
  return value.charAt(0).toLocaleUpperCase("vi-VN") + value.slice(1);
}

export function QuizExercise({
  word,
  options,
  selectedAnswer,
  score,
  isLastQuestion,
  onAnswer,
  onNext,
}: QuizExerciseProps) {
  const isCorrect = selectedAnswer === word[1];

  return (
    <section className="mt-7 rounded-3xl border-2 border-[#10243e] bg-white p-6 shadow-[6px_7px_0_#10243e] md:p-10">
      <p className="text-xs font-black uppercase tracking-widest text-blue-700">
        Ôn tập toàn bộ từ vựng
      </p>
      <h2 className="mt-2 text-3xl font-black">Từ này nghĩa là gì?</h2>
      <p
        lang="ko"
        className="font-korean mt-8 text-center text-6xl font-black"
      >
        {word[0]}
      </p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const selected = selectedAnswer === option;
          const answerClass = selected
            ? option === word[1]
              ? "bg-green-500 text-white"
              : "bg-red-400 text-white"
            : "bg-white";

          return (
            <button
              key={option}
              type="button"
              disabled={selectedAnswer !== null}
              onClick={() => onAnswer(option)}
              className={`rounded-2xl border-2 border-[#10243e] p-4 text-left font-bold shadow-[3px_4px_0_#10243e] disabled:cursor-default ${answerClass}`}
            >
              {capitalizeFirst(option)}
            </button>
          );
        })}
      </div>
      {selectedAnswer && (
        <div
          aria-live="polite"
          className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#dcecff] p-4"
        >
          <p className="font-bold">
            {isCorrect
              ? "Chính xác!"
              : `Đáp án đúng: ${capitalizeFirst(word[1])}`}
          </p>
          {!isLastQuestion && (
            <button
              type="button"
              onClick={onNext}
              className="rounded-xl bg-[#10243e] px-5 py-2.5 font-black text-white"
            >
              Câu tiếp theo →
            </button>
          )}
        </div>
      )}
      <p className="mt-5 text-center font-bold text-blue-700">Điểm: {score}</p>
    </section>
  );
}
