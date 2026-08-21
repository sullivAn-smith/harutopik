import type { VocabularyItem } from "@/content/schema";
import { SaveToListButton } from "@/features/vocabulary-lists/save-to-list-button";

type FlashcardExerciseProps = {
  word: VocabularyItem;
  lessonId: string;
  position: number;
  total: number;
  learnedCount: number;
  flaggedCount?: number;
  learned: boolean;
  flagged: boolean;
  reviewMode?: boolean;
  reviewPosition?: number;
  reviewTotal?: number;
  flipped: boolean;
  skipFlipAnimation: boolean;
  onFlip: () => void;
  onReplayAudio: () => void;
  onToggleFlag: () => void;
  onMarkLearned: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onRestart: () => void;
  nextLabel?: string;
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
  flaggedCount = 0,
  learned,
  flagged,
  reviewMode = false,
  reviewPosition,
  reviewTotal,
  flipped,
  skipFlipAnimation,
  onFlip,
  onReplayAudio,
  onToggleFlag,
  onMarkLearned,
  onPrevious,
  onNext,
  onRestart,
  nextLabel,
}: FlashcardExerciseProps) {
  const first = reviewMode
    ? reviewPosition === undefined || reviewPosition === 0
    : position === 0;
  const last = position === total - 1;
  const displayPosition = reviewMode && reviewPosition !== undefined
    ? reviewPosition + 1
    : position + 1;
  const displayTotal = reviewMode && reviewTotal !== undefined ? reviewTotal : total;
  return (
    <section className="mt-7 grid items-stretch gap-5 lg:grid-cols-[230px_1fr]">
      <aside className="rounded-3xl border border-white bg-white/95 p-6 shadow-[0_16px_35px_rgba(16,36,62,0.16)]">
        <p className="inline-flex rounded-lg bg-[#087eba] px-3 py-1.5 text-xs font-black uppercase tracking-widest text-white shadow-sm">
          Tiến độ
        </p>
        <p className="mt-3 text-4xl font-black tracking-tight text-[#10243e]">
          {learnedCount}/{total}
        </p>
        <p className="mt-2 text-sm font-black text-amber-700">
          {flaggedCount} từ cần ôn lại
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

      <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-[#d6e7f3] bg-[#dceef9] shadow-[0_16px_35px_rgba(16,36,62,0.12)] backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-[#b9d9e8] bg-gradient-to-r from-[#dceef9] to-[#d3e7f5] px-5 py-4">
          <span className="font-black">
            {displayPosition} / {displayTotal}
          </span>
          <div className="flex gap-2">
            <SaveToListButton lessonId={lessonId} item={word} />
            <button
              type="button"
              onClick={onReplayAudio}
              disabled={!word.audioUrl}
              className="grid h-11 w-11 place-items-center rounded-xl border-2 border-[#10243e] bg-[#087eba] text-xl text-white transition hover:bg-[#066a9e] disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={`Đọc lại từ ${word.korean}`}
              title="Đọc lại từ hiện tại"
            >
              <span aria-hidden="true">🔊</span>
            </button>
            <button
              type="button"
              onClick={onToggleFlag}
              className={`rounded-xl border-2 border-[#10243e] px-3 py-2 font-black ${
                flagged ? "bg-amber-300 text-amber-950" : "bg-white"
              }`}
              aria-label={
                flagged
                  ? "Bỏ đánh dấu cần ôn lại"
                  : "Đánh dấu cần ôn lại"
              }
              title={flagged ? "Bỏ đánh dấu cần ôn lại" : "Đánh dấu cần ôn lại"}
            >
              🚩
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
            <span className="flashcard-face flashcard-front bg-gradient-to-br from-[#dceef9] via-[#edf6fc] to-[#d3e7f5]">
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
            <span className="flashcard-face flashcard-back bg-gradient-to-br from-[#e9faf5] via-[#f4fcf9] to-[#dff5ef]">
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

        <div className="flex flex-wrap items-center justify-center gap-3 border-t border-[#b9e4da] bg-gradient-to-r from-[#e9faf5] to-[#e3f7f2] px-5 py-5">
          <button
            type="button"
            onClick={onPrevious}
            disabled={first}
            aria-label="Thẻ trước"
            title="Thẻ trước"
            className="grid h-12 w-12 place-items-center rounded-full border-2 border-[#10243e] bg-blue-50 text-3xl font-black leading-none text-[#10243e] shadow-[0_4px_0_#10243e] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-35"
          >
            ←
          </button>
          <div className="flex gap-2">
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
            aria-label={nextLabel ?? (last ? "Kết thúc phiên flashcard" : "Thẻ sau")}
            title={nextLabel ?? (last ? "Kết thúc phiên flashcard" : "Thẻ sau")}
            className="grid min-h-12 min-w-12 place-items-center rounded-full border-2 border-[#10243e] bg-[#10243e] px-4 text-base font-black leading-none text-white shadow-[0_4px_0_#071224] transition hover:-translate-y-0.5"
          >
            {nextLabel ?? (last ? "Kết thúc" : "Tiếp →")}
          </button>
          {last && !reviewMode && (
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

export function FlashcardSummary({
  flaggedCount,
  learnedCount,
  total,
  reviewAvailable,
  complete = false,
  onReview,
  onFinish,
  onRestart,
}: {
  flaggedCount: number;
  learnedCount: number;
  total: number;
  reviewAvailable: boolean;
  complete?: boolean;
  onReview?: () => void;
  onFinish?: () => void;
  onRestart: () => void;
}) {
  return (
    <section className="mx-auto mt-7 max-w-3xl rounded-3xl border border-white/80 bg-white/95 p-8 text-center shadow-[0_18px_45px_rgba(16,36,62,0.16)] md:p-10">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#087eba]">
        {complete ? "Flashcard đã lưu" : "Đã xem hết bộ từ"}
      </p>
      <h2 className="mt-3 text-3xl font-black text-[#10243e] md:text-4xl">
        {complete ? "Tiến độ đã được lưu" : "Bạn muốn làm gì tiếp theo?"}
      </h2>
      <div className="mx-auto mt-7 grid max-w-xl grid-cols-2 gap-3">
        <div className="rounded-2xl bg-emerald-50 p-4 text-left">
          <strong className="block text-2xl font-black text-emerald-700">
            {learnedCount}/{total}
          </strong>
          <span className="text-sm font-bold text-emerald-900/65">Đã thuộc</span>
        </div>
        <div className="rounded-2xl bg-amber-50 p-4 text-left">
          <strong className="block text-2xl font-black text-amber-700">
            {flaggedCount}
          </strong>
          <span className="text-sm font-bold text-amber-900/65">Cần ôn lại</span>
        </div>
      </div>
      {complete ? (
        <p className="mt-6 text-sm font-semibold leading-6 text-[#52637a]">
          Các từ cần ôn đã được đưa vào lịch ôn lại. Bạn có thể quay lại bài học
          hoặc học lại flashcard bất cứ lúc nào.
        </p>
      ) : (
        <p className="mt-6 text-sm font-semibold leading-6 text-[#52637a]">
          Những từ chưa đánh giá hoặc đã gắn cờ sẽ được đưa vào vòng ôn lại.
        </p>
      )}
      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        {!complete && reviewAvailable && onReview && (
          <button
            type="button"
            onClick={onReview}
            className="min-h-14 rounded-xl bg-amber-300 px-5 py-3 font-black text-amber-950 shadow-[0_5px_0_#b7791f]"
          >
            ÔN LẠI NGAY ({flaggedCount})
          </button>
        )}
        {!complete && onFinish && (
          <button
            type="button"
            onClick={onFinish}
            className="min-h-14 rounded-xl bg-[#10243e] px-5 py-3 font-black text-white shadow-[0_5px_0_#071224]"
          >
            KẾT THÚC
          </button>
        )}
        {complete ? (
          <button
            type="button"
            onClick={onRestart}
            className="min-h-14 rounded-xl bg-emerald-500 px-5 py-3 font-black text-emerald-950 shadow-[0_5px_0_#047857]"
          >
            HỌC LẠI FLASHCARD
          </button>
        ) : (
          <button
            type="button"
            onClick={onRestart}
            className="min-h-14 rounded-xl border-2 border-[#10243e] bg-white px-5 py-3 font-black text-[#10243e]"
          >
            QUAY LẠI THẺ ĐẦU
          </button>
        )}
      </div>
    </section>
  );
}
