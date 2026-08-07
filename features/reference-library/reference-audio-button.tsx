"use client";

import { useState } from "react";
import { enqueueAudioPlayback } from "@/lib/audio/playback-queue";

export function ReferenceAudioButton({
  audioUrl,
  text,
}: {
  audioUrl?: string;
  text: string;
}) {
  const [playing, setPlaying] = useState(false);
  if (!audioUrl) return null;

  return (
    <button
      type="button"
      disabled={playing}
      aria-label={`Nghe ${text}`}
      onClick={async () => {
        setPlaying(true);
        try {
          await enqueueAudioPlayback({ audioUrl });
        } finally {
          setPlaying(false);
        }
      }}
      className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-sky-200 bg-sky-50 text-lg text-sky-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-sky-100 disabled:opacity-60"
    >
      {playing ? "…" : "🔊"}
    </button>
  );
}
