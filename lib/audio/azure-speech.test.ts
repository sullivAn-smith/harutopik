import { describe, expect, it, vi } from "vitest";
import { generateSpeech } from "./azure-speech";
import type { TtsConfig } from "./types";

const config: TtsConfig = {
  provider: "azure",
  endpoint:
    "https://southeastasia.tts.speech.microsoft.com/cognitiveservices/v1",
  key: "server-secret",
  voice: "ko-KR-SunHiNeural",
  rate: "-12%",
  outputFormat: "audio-24khz-48kbitrate-mono-mp3",
};

describe("Azure Speech adapter", () => {
  it("requests Korean MP3 using SSML and returns its bytes", async () => {
    const fetchMock = vi.fn(
      async (_url: string | URL | Request, init?: RequestInit) => {
        expect(init?.headers).toMatchObject({
          "Ocp-Apim-Subscription-Key": "server-secret",
          "Content-Type": "application/ssml+xml",
          "X-Microsoft-OutputFormat":
            "audio-24khz-48kbitrate-mono-mp3",
        });
        expect(String(init?.body)).toContain(
          '<voice name="ko-KR-SunHiNeural">',
        );
        expect(String(init?.body)).toContain('<prosody rate="-12%">');
        expect(String(init?.body)).toContain("안녕하세요");
        return new Response(Buffer.from("mp3"), { status: 200 });
      },
    );

    const audio = await generateSpeech(
      "안녕하세요",
      config,
      fetchMock as typeof fetch,
    );
    expect(audio.toString()).toBe("mp3");
  });

  it("escapes XML and does not expose the key in provider errors", async () => {
    const fetchMock = vi.fn(
      async (_url: string | URL | Request, init?: RequestInit) => {
        expect(String(init?.body)).toContain("&amp;");
        return new Response("invalid SSML", { status: 400 });
      },
    );

    await expect(
      generateSpeech("안녕 & 반가워요", config, fetchMock as typeof fetch),
    ).rejects.not.toThrow("server-secret");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
