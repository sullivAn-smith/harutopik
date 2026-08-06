import type { VocabularyItem } from "@/content/schema";
import { SaveToListButton } from "@/features/vocabulary-lists/save-to-list-button";

type FlashcardExerciseProps = {
  word: VocabularyItem;
  lessonId: string;
  position: number;
  total: number;
  learnedCount: number;
  learned: boolean;
  flipped: boolean;
  skipFlipAnimation: boolean;
  onFlip: () => void;
  onSpeak: () => void;
  onToggleLearned: () => void;
  onMarkLearned: () => void;
  onMarkUnlearned: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onRestart: () => void;
};

function capitalizeFirst(value: string) {
  return value.charAt(0).toLocaleUpperCase("vi-VN") + value.slice(1);
}

export function FlashcardExercise({
  word,
  lessonId,
  position,
  total,
  learnedCount,
  learned,
  flipped,
  skipFlipAnimation,
  onFlip,
  onSpeak,
  onToggleLearned,
  onMarkLearned,
  onMarkUnlearned,
  onPrevious,
  onNext,
  onRestart,
}: FlashcardExerciseProps) {
  const first = position === 0;
  const last = position === total - 1;
  return (
    <section className="mt-7 grid items-stretch gap-5 lg:grid-cols-[230px_1fr]">
      <aside className="rounded-3xl border border-white bg-white/95 p-6 shadow-[0_16px_35px_rgba(16,36,62,0.16)]">
        <p className="inline-flex rounded-lg bg-[#087eba] px-3 py-1.5 text-xs font-black uppercase tracking-widest text-white shadow-sm">
          Tiến độ
        </p>
        <p className="mt-3 text-4xl font-black tracking-tight text-[#10243e]">
          {learnedCount}/{total}
        </p>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-blue-100">
          <div
            className="h-full rounded-full bg-[#087eba] transition-all"
            style={{ width: `${(learnedCount / total) * 100}%` }}
          />
        </div>
        <p className="mt-7 text-sm font-semibold leading-6 text-[#52637a]">
          Lật thẻ để xem nghĩa, sau đó đánh dấu mức độ ghi nhớ của bạn.
        </p>
      </aside>

      <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-white/80 bg-white/80 shadow-[0_16px_35px_rgba(16,36,62,0.12)] backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-[#10243e]/10 px-5 py-4">
          <span className="font-black">
            {position + 1} / {total}
          </span>
          <div className="flex gap-2">
            <SaveToListButton lessonId={lessonId} item={word} />
            <button
              type="button"
              onClick={onSpeak}
              className="rounded-xl border-2 border-[#10243e] bg-white px-3 py-2 font-black hover:bg-blue-50"
              aria-label={`Phát âm ${word.korean}`}
            >
              🔊
            </button>
            <button
              type="button"
              onClick={onToggleLearned}
              className={`rounded-xl border-2 border-[#10243e] px-3 py-2 font-black ${
                learned ? "bg-green-600 text-white" : "bg-white"
              }`}
              aria-label={
                learned ? "Bỏ đánh dấu đã thuộc" : "Đánh dấu đã thuộc"
              }
            >
              ✓
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onFlip}
          className="flashcard-stage min-h-[390px] w-full flex-1 p-6 text-center"
          aria-label="Lật flashcard"
          aria-pressed={flipped}
        >
          <span
            className={`flashcard-inner h-full ${
              flipped ? "is-flipped" : ""
            } ${skipFlipAnimation ? "skip-flip-animation" : ""}`}
          >
            <span className="flashcard-face flashcard-front bg-gradient-to-br from-[#8ec5ff] to-[#cbe6ff]">
              {word.imageUrl && (
                <span
                  aria-hidden="true"
                  className="block h-40 w-56 overflow-hidden rounded-2xl border border-white/80 bg-white bg-cover bg-center bg-no-repeat shadow-[0_10px_24px_rgba(16,36,62,0.14)]"
                  style={{
                    backgroundImage: `url(${word.imageUrl})`,
                  }}
                />
              )}
              <strong
                lang="ko"
                className="font-korean mt-4 text-5xl font-black leading-tight md:text-7xl"
              >
                {word.korean}
              </strong>
              <span className="mt-4 text-sm font-semibold text-[#10243e]/55">
                Nhấn để xem nghĩa tiếng Việt
              </span>
            </span>
            <span className="flashcard-face flashcard-back bg-gradient-to-br from-[#c9e7ff] to-[#f0f8ff]">
              <span className="text-xs font-black uppercase tracking-widest text-blue-800">
                Nghĩa tiếng Việt
              </span>
              <strong className="text-4xl font-black leading-tight md:text-6xl">
                {capitalizeFirst(word.vietnamese)}
              </strong>
              <span className="mt-3 rounded-full bg-white/65 px-4 py-1.5 text-base font-bold italic tracking-wide text-[#245d93]">
                {word.romanization}
              </span>
              <span className="mt-6 text-sm font-semibold text-[#10243e]/55">
                Nhấn để xem lại tiếng Hàn
              </span>
            </span>
          </span>
        </button>

        <div className="flex flex-wrap items-center justify-center gap-3 px-5 py-5">
          <SaveToListButton lessonId={lessonId} item={word} variant="button" />
          <button
            type="button"
            onClick={onPrevious}
            disabled={first}
            className="rounded-xl border-2 border-[#10243e] bg-blue-50 px-5 py-3 text-base font-black text-[#10243e] shadow-[0_5px_0_#10243e] disabled:cursor-not-allowed disabled:opacity-35"
          >
            ← Trước
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onMarkUnlearned}
              className={`rounded-xl border-2 border-[#10243e] px-4 py-3 text-base font-black shadow-[0_5px_0_#10243e] ${
                !learned
                  ? "bg-[#d9574c] text-white"
                  : "bg-red-50 text-red-800"
              }`}
            >
              ✕ Chưa thuộc
            </button>
            <button
              type="button"
              onClick={onMarkLearned}
              className={`rounded-xl border-2 border-[#10243e] px-4 py-3 text-base font-black shadow-[0_5px_0_#10243e] ${
                learned
                  ? "bg-green-600 text-white"
                  : "bg-emerald-50 text-emerald-800"
              }`}
            >
              ✓ Đã thuộc
            </button>
          </div>
          <button
            type="button"
            onClick={onNext}
            disabled={last}
            className="rounded-xl border-2 border-[#10243e] bg-[#10243e] px-5 py-3 text-base font-black text-white shadow-[0_5px_0_#071224] disabled:cursor-not-allowed disabled:opacity-35"
          >
            Sau →
          </button>
          {last && (
            <button
              type="button"
              onClick={onRestart}
              className="rounded-xl border-2 border-[#10243e] bg-blue-500 px-5 py-3 text-base font-black text-white shadow-[0_5px_0_#10243e]"
            >
              ↻ Quay lại từ đầu
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
