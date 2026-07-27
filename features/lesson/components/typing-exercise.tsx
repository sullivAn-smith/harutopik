import type { VocabularyTuple } from "@/features/lesson/types";

type TypingExerciseProps = {
  word: VocabularyTuple;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  onCheck: () => void;
  onNext: () => void;
};

function capitalizeFirst(value: string) {
  return value.charAt(0).toLocaleUpperCase("vi-VN") + value.slice(1);
}

export function TypingExercise({
  word,
  value,
  checked,
  onChange,
  onCheck,
  onNext,
}: TypingExerciseProps) {
  const correct = value.trim() === word[0];

  return (
    <section className="mt-7 rounded-3xl border-2 border-[#10243e] bg-white p-6 shadow-[6px_7px_0_#10243e] md:p-10">
      <p className="text-xs font-black uppercase tracking-widest text-blue-700">
        Gõ từ tiếng Hàn
      </p>
      <h2 className="mt-2 text-3xl font-black">
        {capitalizeFirst(word[1])}
      </h2>
      <p className="mt-2 text-[#10243e]/55">
        Hãy nhập từ tiếng Hàn tương ứng
      </p>
      <input
        value={value}
        autoComplete="off"
        lang="ko"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => event.key === "Enter" && onCheck()}
        className="mt-7 w-full rounded-2xl border-2 border-[#10243e] bg-blue-50 px-5 py-4 text-2xl font-black outline-none focus:ring-4 focus:ring-blue-200"
        placeholder="Nhập tiếng Hàn…"
      />
      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onCheck}
          className="rounded-xl bg-[#10243e] px-5 py-3 font-black text-white"
        >
          Kiểm tra
        </button>
        {checked && (
          <button
            type="button"
            onClick={onNext}
            className="rounded-xl border-2 border-[#10243e] bg-white px-5 py-3 font-black"
          >
            Từ tiếp theo →
          </button>
        )}
      </div>
      {checked && (
        <div
          aria-live="polite"
          className={`mt-5 rounded-2xl p-4 font-bold ${
            correct
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {correct ? (
            "Chính xác!"
          ) : (
            <>
              Chưa đúng. Đáp án:{" "}
              <strong className="text-xl" lang="ko">
                {word[0]}
              </strong>
            </>
          )}
        </div>
      )}
    </section>
  );
}
