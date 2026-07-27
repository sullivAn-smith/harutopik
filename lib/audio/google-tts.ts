export type GoogleTtsOptions = {
  apiKey: string;
  text: string;
  voice: string;
  speakingRate?: number;
};

type GoogleTtsResponse = {
  audioContent?: string;
  error?: { message?: string };
};

export async function synthesizeGoogleTts(
  options: GoogleTtsOptions,
  fetchImpl: typeof fetch = fetch,
) {
  const response = await fetchImpl(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(options.apiKey)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        input: { text: options.text },
        voice: {
          languageCode: "ko-KR",
          name: options.voice,
        },
        audioConfig: {
          audioEncoding: "MP3",
          speakingRate: options.speakingRate ?? 0.9,
        },
      }),
      signal: AbortSignal.timeout(20_000),
    },
  );
  const payload = (await response.json().catch(() => ({}))) as GoogleTtsResponse;
  if (!response.ok || !payload.audioContent) {
    throw new Error(payload.error?.message || `Google TTS trả về HTTP ${response.status}.`);
  }
  const audio = Buffer.from(payload.audioContent, "base64");
  if (audio.byteLength === 0) throw new Error("Google TTS trả về audio trống.");
  if (audio.byteLength > 2 * 1024 * 1024)
    throw new Error("Audio TTS vượt quá giới hạn 2 MB.");
  return audio;
}
