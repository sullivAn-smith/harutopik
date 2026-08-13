"use client";

import { useVocabularyTts } from "@/features/vocabulary-admin/use-vocabulary-tts";

export function VocabularyListAudioButton({
  vocabularyId,
  currentAudioUrl,
}: {
  vocabularyId: string;
  currentAudioUrl?: string | null;
}) {
  const { status, message, audioUrl, generate, play } =
    useVocabularyTts(vocabularyId);
  const playableUrl = audioUrl || currentAudioUrl || "";
  const busy = status === "generating";

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      {playableUrl ? (
        <button
          type="button"
          onClick={() => play(playableUrl)}
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-800 transition hover:border-emerald-400 hover:bg-emerald-100"
        >
          ▶ Nghe thử
        </button>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => void generate()}
          className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-black text-violet-800 transition hover:border-violet-400 hover:bg-violet-100 disabled:cursor-wait disabled:opacity-60"
        >
          {busy ? "Đang tạo…" : "Tạo audio"}
        </button>
      )}
      {message && !playableUrl && (
        <span
          role="status"
          title={message}
          className={`max-w-36 truncate text-[11px] font-bold ${
            status === "error" ? "text-red-700" : "text-violet-700"
          }`}
        >
          {message}
        </span>
      )}
    </div>
  );
}
