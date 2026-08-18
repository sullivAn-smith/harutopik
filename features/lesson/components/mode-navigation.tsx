import Link from "next/link";
import type { StudyMode } from "@/features/lesson/types";
import type { LessonProgressSnapshot } from "@/lib/learning-core/lesson-progress";

const modes: ReadonlyArray<{
  value: StudyMode;
  label: string;
}> = [
  { value: "flashcard", label: "▱ Flashcard" },
  { value: "quiz", label: "◉ Trắc nghiệm" },
  { value: "typing", label: "⌨ Gõ từ" },
  { value: "matching", label: "⇄ Nối từ" },
  { value: "dictation", label: "♬ Chính tả" },
  { value: "translation", label: "文 Dịch câu" },
];

type ModeNavigationProps = {
  activeMode: StudyMode;
  availableModes: readonly StudyMode[];
  onChange: (mode: StudyMode) => void;
  speedTestHref?: string;
  speedTestProgress?: LessonProgressSnapshot;
  onLockedSpeedTestClick?: () => void;
};

export function ModeNavigation({
  activeMode,
  availableModes,
  onChange,
  speedTestHref,
  speedTestProgress,
  onLockedSpeedTestClick,
}: ModeNavigationProps) {
  return (
    <nav
      aria-label="Chế độ học"
      className="mt-7 flex gap-2 overflow-x-auto rounded-2xl border border-white/80 bg-white/75 p-2 shadow-sm backdrop-blur"
    >
      {modes.filter((mode) => availableModes.includes(mode.value)).map((mode) => (
        <button
          key={mode.value}
          type="button"
          aria-pressed={activeMode === mode.value}
          onClick={() => onChange(mode.value)}
          className={`shrink-0 rounded-xl px-4 py-3 text-sm font-bold transition ${
            activeMode === mode.value
              ? "bg-[#087eba] text-white shadow-sm"
              : "text-[#52637a] hover:bg-blue-50 hover:text-[#087eba]"
          }`}
        >
          {mode.label}
        </button>
      ))}
      {speedTestHref &&
        (!speedTestProgress || speedTestProgress.speedTestUnlocked) && (
        <Link
          href={speedTestHref}
          className="ml-auto shrink-0 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-3 text-sm font-black text-[#10243e] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          ⚡ Speed Test Arena
        </Link>
      )}
      {speedTestHref &&
        speedTestProgress &&
        !speedTestProgress.speedTestUnlocked && (
          <button
            type="button"
            onClick={onLockedSpeedTestClick}
            aria-label={`Speed Test chưa mở, tiến độ ${speedTestProgress.completionPercent}%`}
            className="ml-auto shrink-0 rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 text-sm font-black text-slate-500 transition hover:bg-slate-200"
          >
            🔒 Speed Test · {speedTestProgress.completionPercent}%
          </button>
        )}
    </nav>
  );
}
