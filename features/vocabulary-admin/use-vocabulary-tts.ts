"use client";

import { useState } from "react";

type AudioApiResponse = {
  data?: {
    status: "ready" | "processing";
    audioUrl?: string;
    cached?: boolean;
  };
  error?: { message?: string };
};

export function useVocabularyTts(vocabularyId: string) {
  const [status, setStatus] = useState<
    "idle" | "generating" | "ready" | "processing" | "error"
  >("idle");
  const [message, setMessage] = useState("");
  const [audioUrl, setAudioUrl] = useState("");

  async function generate() {
    setStatus("generating");
    setMessage("Đang kiểm tra cache và tạo audio nếu cần...");
    try {
      const response = await fetch(
        `/api/v1/vocabulary/${encodeURIComponent(vocabularyId)}/audio`,
        { method: "POST" },
      );
      const payload = (await response.json()) as AudioApiResponse;
      if (!response.ok || !payload.data) {
        setStatus("error");
        setMessage(
          payload.error?.message ?? "Chưa thể tạo audio. Hãy thử lại.",
        );
        return null;
      }
      if (payload.data.status === "processing") {
        setStatus("processing");
        setMessage("Audio này đang được xử lý. Hãy thử lại sau ít phút.");
        return null;
      }
      const url = payload.data.audioUrl ?? "";
      setAudioUrl(url);
      setStatus("ready");
      setMessage(
        payload.data.cached
          ? "Đã dùng lại audio có sẵn, không tiêu thêm quota Azure."
          : "Đã tạo audio và lưu lên Supabase CDN.",
      );
      return url;
    } catch {
      setStatus("error");
      setMessage("Mất kết nối khi tạo audio. Hãy thử lại.");
      return null;
    }
  }

  function play(url = audioUrl) {
    if (!url) return;
    const audio = new Audio(url);
    void audio.play().catch(() => {
      setStatus("error");
      setMessage("Trình duyệt chưa thể phát audio này.");
    });
  }

  return { status, message, audioUrl, generate, play };
}
