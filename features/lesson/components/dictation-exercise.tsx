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
  onRetry: () => void;
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
  onRetry,
  onNext,
}: DictationExerciseProps) {
  const words = sentence.trim().split(/\s+/).filter(Boolean);
  const maximumHints = Math.min(3, words.length);
  const revealedWords = words.slice(0, visibleHintWords);
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
        readOnly={checked}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => event.key === "Enter" && !checked && onCheck()}
        className="mt-6 w-full rounded-2xl border-2 border-[#10243e] bg-blue-50 px-5 py-4 text-lg font-bold outline-none read-only:cursor-not-allowed read-only:opacity-70"
        placeholder="Gõ câu tiếng Hàn bạn nghe được…"
      />
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onHint}
          disabled={checked || visibleHintWords >= maximumHints}
          className="rounded-xl border-2 border-amber-300 bg-amber-50 px-5 py-2.5 font-black text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          💡 Gợi ý ({visibleHintWords}/{maximumHints})
        </button>
        <button
          type="button"
          onClick={onCheck}
          disabled={checked || !value.trim()}
          className="rounded-xl bg-gradient-to-r from-[#087eba] to-sky-500 px-5 py-2.5 font-black text-white shadow-md transition hover:-translate-y-0.5"
        >
          Kiểm tra
        </button>
      </div>
      {revealedWords.length > 0 && (
        <div
          role="status"
          className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950"
        >
          <p className="text-xs font-black uppercase tracking-wider text-amber-700">
            Gợi ý {visibleHintWords}/{maximumHints}
          </p>
          <p className="mt-1 font-bold">
            {visibleHintWords < maximumHints
              ? "Câu bắt đầu bằng:"
              : "Các từ đầu tiên:"}{" "}
            <span lang="ko" className="text-lg font-black">
              {revealedWords.join(" ")}
            </span>
          </p>
        </div>
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
      {checked && (
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onRetry}
            className="rounded-xl border-2 border-sky-300 bg-white px-5 py-2.5 font-black text-[#087eba] transition hover:bg-sky-50"
          >
            ↻ Làm lại câu này
          </button>
          {!isLastQuestion && (
            <button
              type="button"
              onClick={onNext}
              className="rounded-xl bg-gradient-to-r from-[#087eba] to-sky-500 px-5 py-2.5 font-black text-white shadow-md transition hover:-translate-y-0.5"
            >
              Câu tiếp theo →
            </button>
          )}
        </div>
      )}
    </section>
  );
}
