type DictationExerciseProps = {
  sentence: string;
  position: number;
  total: number;
  value: string;
  checked: boolean;
  correct: boolean;
  visibleHintWords: number;
  onChange: (value: string) => void;
  onListen: () => void;
  onHint: () => void;
  onCheck: () => void;
  onNext: () => void;
};

export function DictationExercise({
  sentence,
  position,
  total,
  value,
  checked,
  correct,
  visibleHintWords,
  onChange,
  onListen,
  onHint,
  onCheck,
  onNext,
}: DictationExerciseProps) {
  const words = sentence.split(" ");
  const isLastQuestion = position === total - 1;

  return (
    <section className="mt-7 rounded-3xl border-2 border-[#10243e] bg-white p-6 shadow-[6px_7px_0_#10243e] md:p-10">
      <p className="text-xs font-black uppercase tracking-widest text-blue-700">
        Nghe chép chính tả · {position + 1}/{total}
      </p>
      <h2 className="mt-2 text-3xl font-black">Nghe và viết lại câu</h2>
      <button
        type="button"
        onClick={onListen}
        className="mt-7 rounded-full bg-blue-500 px-6 py-3 font-black text-white"
      >
        🔊 Nghe câu
      </button>
      <input
        value={value}
        lang="ko"
        autoComplete="off"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => event.key === "Enter" && onCheck()}
        className="mt-6 w-full rounded-2xl border-2 border-[#10243e] bg-blue-50 px-5 py-4 text-lg font-bold outline-none"
        placeholder="Gõ câu tiếng Hàn bạn nghe được…"
      />
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onHint}
          className="rounded-xl border-2 border-[#10243e] bg-yellow-100 px-5 py-2.5 font-black"
        >
          Gợi ý ({visibleHintWords}/{words.length})
        </button>
        <button
          type="button"
          onClick={onCheck}
          className="rounded-xl bg-gradient-to-r from-[#087eba] to-sky-500 px-5 py-2.5 font-black text-white shadow-md transition hover:-translate-y-0.5"
        >
          Kiểm tra
        </button>
      </div>
      {visibleHintWords > 0 && (
        <p className="mt-4 rounded-xl bg-yellow-50 p-4 font-bold text-yellow-900">
          Gợi ý:{" "}
          <span lang="ko">{words.slice(0, visibleHintWords).join(" ")}</span>
        </p>
      )}
      {checked && (
        <div
          aria-live="polite"
          className={`mt-4 rounded-xl p-4 font-bold ${
            correct
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {correct ? "Chính xác!" : <><span>Đáp án: </span><span lang="ko">{sentence}</span></>}
        </div>
      )}
      {checked && !isLastQuestion && (
        <button
          type="button"
          onClick={onNext}
          className="mt-5 rounded-xl border-2 border-sky-300 bg-white px-5 py-2.5 font-black text-[#087eba] transition hover:bg-sky-50"
        >
          Câu tiếp theo →
        </button>
      )}
    </section>
  );
}
