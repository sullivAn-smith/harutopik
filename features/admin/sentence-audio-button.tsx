"use client";

import { useState } from "react";
import { enqueueAudioPlayback } from "@/lib/audio/playback-queue";

export function SentenceAudioButton({
  text,
  currentAudioUrl,
  onGenerated,
}: {
  text: string;
  currentAudioUrl?: string;
  onGenerated: (audioUrl: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function generate() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/v1/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const payload = await response.json();
      const audioUrl = payload?.data?.audioUrl;
      if (!response.ok || typeof audioUrl !== "string") {
        throw new Error(payload?.error?.message ?? "Không thể tạo audio.");
      }
      onGenerated(audioUrl);
      setMessage(payload.data.cached ? "Đã dùng audio có sẵn." : "Đã tạo audio Azure.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể tạo audio.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {currentAudioUrl && (
        <button
          type="button"
          onClick={() =>
            void enqueueAudioPlayback({
              audioUrl: currentAudioUrl,
              fallbackText: text,
            })
          }
          className="rounded-xl border-2 border-sky-200 bg-white px-3 py-2 text-sm font-black text-[#087eba] transition hover:border-sky-400 hover:bg-sky-50"
        >
          ▶ Nghe thử
        </button>
      )}
      <button
        type="button"
        disabled={busy || !text.trim()}
        onClick={() => void generate()}
        className="rounded-xl bg-gradient-to-r from-[#087eba] to-sky-500 px-3 py-2 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 disabled:opacity-50"
      >
        {busy ? "Đang tạo…" : currentAudioUrl ? "Tạo lại Azure" : "Tạo Azure"}
      </button>
      {message && <span className="text-xs font-bold text-[#245d93]">{message}</span>}
    </div>
  );
}
