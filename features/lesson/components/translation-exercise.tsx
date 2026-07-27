export type TranslationDirection = "vi-ko" | "ko-vi";

type TranslationExerciseProps = {
  pair: readonly [vietnamese: string, korean: string];
  position: number;
  total: number;
  direction: TranslationDirection;
  value: string;
  checked: boolean;
  correct: boolean;
  directionNotice: string;
  onDirectionChange: () => void;
  onChange: (value: string) => void;
  onCheck: () => void;
  onNext: () => void;
};

export function TranslationExercise({
  pair,
  position,
  total,
  direction,
  value,
  checked,
  correct,
  directionNotice,
  onDirectionChange,
  onChange,
  onCheck,
  onNext,
}: TranslationExerciseProps) {
  const prompt = direction === "vi-ko" ? pair[0] : pair[1];
  const expected = direction === "vi-ko" ? pair[1] : pair[0];
  const isLastQuestion = position === total - 1;

  return (
    <section className="mt-7 rounded-3xl border-2 border-[#10243e] bg-white p-6 shadow-[6px_7px_0_#10243e] md:p-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-blue-700">
            Dịch câu · {position + 1}/{total} ·{" "}
            {direction === "vi-ko" ? "Bước 1/2" : "Bước 2/2"}
          </p>
          <h2 className="mt-2 text-3xl font-black">
            {direction === "vi-ko"
              ? "Dịch sang tiếng Hàn"
              : "Dịch sang tiếng Việt"}
          </h2>
        </div>
        <button
          type="button"
          onClick={onDirectionChange}
          className="rounded-xl border-2 border-[#10243e] bg-blue-50 px-4 py-2.5 font-black"
        >
          {direction === "vi-ko"
            ? "⇄ Tiếp tục: Hàn → Việt"
            : "← Xem lại Việt → Hàn"}
        </button>
      </div>
      {directionNotice && (
        <p
          role="status"
          aria-live="polite"
          className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900"
        >
          {directionNotice}
        </p>
      )}
      <p
        lang={direction === "ko-vi" ? "ko" : "vi"}
        className="mt-7 rounded-2xl bg-[#dcecff] p-6 text-2xl font-black"
      >
        {prompt}
      </p>
      <textarea
        value={value}
        lang={direction === "vi-ko" ? "ko" : "vi"}
        onChange={(event) => onChange(event.target.value)}
        className="mt-5 min-h-28 w-full rounded-2xl border-2 border-[#10243e] bg-white p-5 text-lg font-bold outline-none"
        placeholder="Nhập câu dịch của bạn…"
      />
      <button
        type="button"
        onClick={onCheck}
        className="mt-4 rounded-xl bg-[#10243e] px-5 py-2.5 font-black text-white"
      >
        Kiểm tra
      </button>
      {checked && (
        <div
          aria-live="polite"
          className={`mt-4 rounded-xl p-4 font-bold ${
            correct
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          <span>{correct ? "Chính xác! " : "Đáp án: "}</span>
          <span lang={direction === "vi-ko" ? "ko" : "vi"}>{expected}</span>
        </div>
      )}
      {checked && direction === "ko-vi" && !isLastQuestion && (
        <button
          type="button"
          onClick={onNext}
          className="mt-5 rounded-xl border-2 border-[#10243e] bg-white px-5 py-2.5 font-black"
        >
          Câu tiếp theo →
        </button>
      )}
    </section>
  );
}
