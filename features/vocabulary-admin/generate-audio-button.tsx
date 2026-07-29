"use client";

import { useRouter } from "next/navigation";
import { useVocabularyTts } from "./use-vocabulary-tts";

export function GenerateAudioButton({
  vocabularyId,
  currentAudioUrl,
}: {
  vocabularyId: string;
  currentAudioUrl?: string | null;
}) {
  const router = useRouter();
  const { status, message, audioUrl, generate, play } =
    useVocabularyTts(vocabularyId);
  const playableUrl = audioUrl || currentAudioUrl || "";
  const busy = status === "generating";

  return (
    <div className="flex min-w-64 flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        {playableUrl && (
          <button
            type="button"
            onClick={() => play(playableUrl)}
            className="rounded-xl border border-violet-200 bg-white px-4 py-3 font-black text-violet-800"
          >
            ▶ Nghe thử
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            const url = await generate();
            if (url) router.refresh();
          }}
          className="rounded-xl bg-violet-700 px-5 py-3 font-black text-white disabled:cursor-wait disabled:opacity-60"
        >
          {busy
            ? "Đang tạo..."
            : currentAudioUrl
              ? "Tạo lại audio"
              : "Tạo audio Azure"}
        </button>
      </div>
      {message && (
        <p
          role="status"
          className={`max-w-md text-right text-xs font-bold ${
            status === "error" ? "text-red-700" : "text-violet-800"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
