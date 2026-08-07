"use client";

type PlaybackRequest = {
  audioUrl?: string;
};

let playbackChain = Promise.resolve();
const pendingPlayback = new Map<string, Promise<void>>();

function requestKey(request: PlaybackRequest) {
  return `audio:${request.audioUrl ?? "missing"}`;
}

function playAudioFile(audioUrl: string) {
  return new Promise<void>((resolve, reject) => {
    const audio = new Audio(audioUrl);
    let settled = false;

    const finish = (error?: unknown) => {
      if (settled) return;
      settled = true;
      audio.onended = null;
      audio.onerror = null;
      if (error) reject(error);
      else resolve();
    };

    audio.onended = () => finish();
    audio.onerror = () => finish(new Error("audio_playback_failed"));
    void audio.play().catch(finish);
  });
}

async function executePlayback(request: PlaybackRequest) {
  if (!request.audioUrl) return;
  await playAudioFile(request.audioUrl);
}

/**
 * Xếp audio toàn website vào một hàng đợi duy nhất.
 * Cùng một nút bị bấm liên tục chỉ tạo một lượt phát đang chờ.
 */
export function enqueueAudioPlayback(request: PlaybackRequest) {
  if (!request.audioUrl) return Promise.resolve();
  const key = requestKey(request);
  const existing = pendingPlayback.get(key);
  if (existing) return existing;

  const playback = playbackChain
    .catch(() => undefined)
    .then(() => executePlayback(request))
    .finally(() => pendingPlayback.delete(key));

  pendingPlayback.set(key, playback);
  playbackChain = playback;
  return playback;
}
