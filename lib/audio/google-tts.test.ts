import { describe, expect, it, vi } from "vitest";
import { synthesizeGoogleTts } from "./google-tts";

describe("Google Cloud TTS adapter", () => {
  it("requests Korean MP3 and decodes base64 audio", async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body.voice.languageCode).toBe("ko-KR");
      expect(body.audioConfig.audioEncoding).toBe("MP3");
      return new Response(
        JSON.stringify({ audioContent: Buffer.from("mp3").toString("base64") }),
        { status: 200 },
      );
    });
    const audio = await synthesizeGoogleTts(
      { apiKey: "test", text: "안녕하세요", voice: "ko-KR-Neural2-A" },
      fetchMock as typeof fetch,
    );
    expect(audio.toString()).toBe("mp3");
  });

  it("surfaces provider errors without exposing credentials", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ error: { message: "quota exceeded" } }), {
        status: 429,
      }),
    );
    await expect(
      synthesizeGoogleTts(
        { apiKey: "secret", text: "안녕", voice: "ko-KR-Neural2-A" },
        fetchMock as typeof fetch,
      ),
    ).rejects.toThrow("quota exceeded");
  });
});
