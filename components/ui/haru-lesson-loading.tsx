export function HaruLoadingMessage({ compact = false }: { compact?: boolean }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Haru đang chuẩn bị bài học"
      className={`text-center ${compact ? "p-6" : "p-8"}`}
    >
      <div className={`${compact ? "h-9 w-9" : "h-12 w-12"} mx-auto animate-pulse rounded-full bg-[#49a3d7]`} />
      <p className={`${compact ? "mt-3 text-sm" : "mt-4 text-base sm:text-lg"} font-black text-[#52637a]`}>
        Haru đang chuẩn bị bài học...
      </p>
    </div>
  );
}

export function HaruLessonLoading({ className = "" }: { className?: string }) {
  return (
    <main
      className={`grid min-h-dvh place-items-center bg-[#f7f8fa] p-6 ${className}`}
      aria-busy="true"
    >
      <HaruLoadingMessage />
    </main>
  );
}
