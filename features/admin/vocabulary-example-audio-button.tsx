"use client";

import { useState } from "react";
import { enqueueAudioPlayback } from "@/lib/audio/playback-queue";

type ExampleAudioResponse = {
  data?: { audioUrl?: string; cached?: boolean };
  error?: { message?: string };
};

export function VocabularyExampleAudioButton({
  vocabularyId,
  exampleId,
  currentAudioUrl,
}: {
  vocabularyId: string;
  exampleId: string;
  currentAudioUrl?: string | null;
}) {
  const [audioUrl, setAudioUrl] = useState(currentAudioUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function generate() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(
        `/api/v1/vocabulary/${encodeURIComponent(vocabularyId)}/examples/${encodeURIComponent(exampleId)}/audio`,
        { method: "POST" },
      );
      const payload = (await response.json()) as ExampleAudioResponse;
      const nextAudioUrl = payload.data?.audioUrl;
      if (!response.ok || !nextAudioUrl) {
        throw new Error(
          payload.error?.message ?? "Chưa thể tạo audio câu ví dụ.",
        );
      }
      setAudioUrl(nextAudioUrl);
      setMessage(
        payload.data?.cached
          ? "Đã dùng audio có sẵn và đồng bộ."
          : "Đã tạo và đồng bộ audio ví dụ.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Chưa thể tạo audio ví dụ.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function play() {
    if (!audioUrl) return;
    try {
      await enqueueAudioPlayback({ audioUrl });
    } catch {
      setMessage("Trình duyệt chưa thể phát audio ví dụ này.");
    }
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      {audioUrl ? (
        <button
          type="button"
          onClick={() => void play()}
          className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-black text-sky-800 transition hover:border-sky-400 hover:bg-sky-100"
        >
          ▶ Nghe ví dụ
        </button>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => void generate()}
          className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-black text-violet-800 transition hover:border-violet-400 hover:bg-violet-100 disabled:cursor-wait disabled:opacity-60"
        >
          {busy ? "Đang tạo…" : "Tạo audio ví dụ"}
        </button>
      )}
      {message && (
        <span
          role="status"
          title={message}
          className={`max-w-48 text-right text-[11px] font-bold ${
            audioUrl ? "text-sky-700" : "text-red-700"
          }`}
        >
          {message}
        </span>
      )}
    </div>
  );
}
