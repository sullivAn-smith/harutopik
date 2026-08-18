"use client";

import { useRef } from "react";

export function ExamResultAudioPlayer({ src, questionNumber }: { src: string; questionNumber: number }) {
  const audioRef = useRef<HTMLAudioElement>(null);

  function seekBy(seconds: number) {
    const audio = audioRef.current;
    if (!audio) return;
    const duration = Number.isFinite(audio.duration) ? audio.duration : Number.POSITIVE_INFINITY;
    audio.currentTime = Math.min(Math.max(0, audio.currentTime + seconds), duration);
  }

  return (
    <div className="mt-4 rounded-2xl border border-cyan-100 bg-cyan-50 p-3">
      <audio
        ref={audioRef}
        controls
        controlsList="nodownload noplaybackrate"
        preload="none"
        src={src}
        onContextMenu={(event) => event.preventDefault()}
        className="w-full"
      />
      <div className="mt-2 flex justify-center gap-2">
        <button type="button" onClick={() => seekBy(-5)} aria-label={`Tua về 5 giây audio câu ${questionNumber}`} className="rounded-xl border border-sky-200 bg-white px-4 py-2 font-black text-[#10243e] hover:bg-sky-50">↶ 5s</button>
        <button type="button" onClick={() => seekBy(5)} aria-label={`Tua tới 5 giây audio câu ${questionNumber}`} className="rounded-xl border border-sky-200 bg-white px-4 py-2 font-black text-[#10243e] hover:bg-sky-50">5s ↷</button>
      </div>
    </div>
  );
}
