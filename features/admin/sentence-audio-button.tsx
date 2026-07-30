"use client";

import { useState } from "react";

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
  const [generatedPreview, setGeneratedPreview] = useState<{
    text: string;
    url: string;
  } | null>(null);
  const previewUrl =
    currentAudioUrl ??
    (generatedPreview?.text === text ? generatedPreview.url : undefined);

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
      setGeneratedPreview({ text, url: audioUrl });
      onGenerated(audioUrl);
      setMessage(
        payload.data.cached
          ? "Đã tải audio có sẵn. Bạn có thể nghe thử ngay."
          : "Đã tạo audio Azure. Bạn có thể nghe thử ngay.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể tạo audio.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={busy || !text.trim()}
        onClick={() => void generate()}
        className="rounded-xl bg-gradient-to-r from-[#087eba] to-sky-500 px-3 py-2 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 disabled:opacity-50"
      >
        {busy ? "Đang tạo…" : previewUrl ? "Tạo lại Azure" : "Tạo Azure"}
      </button>
        {message && (
          <span className="text-xs font-bold text-[#245d93]">{message}</span>
        )}
      </div>
      {previewUrl && (
        <div className="rounded-xl border border-sky-200 bg-white p-3">
          <p className="mb-2 text-xs font-black uppercase tracking-wider text-sky-700">
            Nghe thử audio
          </p>
          <audio
            key={previewUrl}
            controls
            preload="metadata"
            src={previewUrl}
            onError={() =>
              setMessage(
                "Audio đã được tạo nhưng trình duyệt chưa tải được file. Hãy kiểm tra Supabase Storage hoặc thử tải lại trang.",
              )
            }
            className="h-10 w-full"
          >
            Trình duyệt không hỗ trợ phát audio.
          </audio>
        </div>
      )}
    </div>
  );
}
