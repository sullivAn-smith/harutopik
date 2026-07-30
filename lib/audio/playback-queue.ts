"use client";

type PlaybackRequest = {
  audioUrl?: string;
  fallbackText?: string;
  language?: string;
  rate?: number;
};

let playbackChain = Promise.resolve();
const pendingPlayback = new Map<string, Promise<void>>();

function requestKey(request: PlaybackRequest) {
  return request.audioUrl
    ? `audio:${request.audioUrl}`
    : `speech:${request.language ?? "ko-KR"}:${request.fallbackText ?? ""}`;
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

function scoreVoice(voice: SpeechSynthesisVoice) {
  const preferredNames = [
    "injoon",
    "in joon",
    "david",
    "male",
    "nam",
    "korean",
  ];
  const name = voice.name.toLowerCase();
  const preference = preferredNames.findIndex((item) => name.includes(item));
  return (
    (voice.localService ? 10 : 0) + (preference === -1 ? 0 : 20 - preference)
  );
}

function speakText(text: string, language: string, rate: number) {
  return new Promise<void>((resolve) => {
    if (!("speechSynthesis" in window)) {
      resolve();
      return;
    }

    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    let settled = false;
    const timeout = window.setTimeout(
      () => finish(),
      Math.min(30_000, Math.max(8_000, text.length * 350)),
    );

    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      utterance.onend = null;
      utterance.onerror = null;
      resolve();
    };

    utterance.lang = language;
    utterance.rate = rate;
    utterance.volume = 1;
    utterance.pitch = 0.98;
    utterance.onend = finish;
    utterance.onerror = finish;
    utterance.voice =
      synth
        .getVoices()
        .filter((voice) =>
          voice.lang.toLowerCase().startsWith(language.slice(0, 2).toLowerCase()),
        )
        .sort((a, b) => scoreVoice(b) - scoreVoice(a))[0] ?? null;
    synth.speak(utterance);
  });
}

async function executePlayback(request: PlaybackRequest) {
  if (request.audioUrl) {
    try {
      await playAudioFile(request.audioUrl);
      return;
    } catch {
      // CDN/audio lỗi thì tiếp tục bằng giọng có sẵn trên thiết bị.
    }
  }

  const text = request.fallbackText?.trim();
  if (!text) return;
  await speakText(
    text,
    request.language ?? "ko-KR",
    request.rate ?? (text.includes(" ") ? 0.7 : 0.64),
  );
}

/**
 * Xếp audio toàn website vào một hàng đợi duy nhất.
 * Cùng một nút bị bấm liên tục chỉ tạo một lượt phát đang chờ.
 */
export function enqueueAudioPlayback(request: PlaybackRequest) {
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
