import type { TtsConfig } from "./types";

const maxAudioBytes = 2 * 1024 * 1024;
const retryableStatuses = new Set([429, 500, 502, 503, 504]);

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function retryDelay(attempt: number) {
  return 500 * 2 ** attempt;
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export class AzureSpeechError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly retryable = false,
  ) {
    super(message);
    this.name = "AzureSpeechError";
  }
}

export async function generateSpeech(
  text: string,
  config: TtsConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<Buffer> {
  const normalizedText = text.normalize("NFC").trim();
  if (!normalizedText || normalizedText.length > 500) {
    throw new AzureSpeechError(
      "Nội dung TTS phải có từ 1 đến 500 ký tự.",
      400,
    );
  }

  const ssml = [
    '<speak version="1.0" xml:lang="ko-KR">',
    `<voice name="${escapeXml(config.voice)}">`,
    `<prosody rate="${escapeXml(config.rate)}">`,
    escapeXml(normalizedText),
    "</prosody>",
    "</voice>",
    "</speak>",
  ].join("");

  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetchImpl(config.endpoint, {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": config.key,
          "Content-Type": "application/ssml+xml",
          "X-Microsoft-OutputFormat": config.outputFormat,
          "User-Agent": "Harutopik-TTS",
        },
        body: ssml,
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) {
        const details = (await response.text().catch(() => "")).slice(0, 300);
        throw new AzureSpeechError(
          `Azure Speech trả về HTTP ${response.status}${
            details ? `: ${details}` : ""
          }.`,
          response.status,
          retryableStatuses.has(response.status),
        );
      }

      const audio = Buffer.from(await response.arrayBuffer());
      if (audio.byteLength === 0) {
        throw new AzureSpeechError("Azure Speech trả về audio trống.");
      }
      if (audio.byteLength > maxAudioBytes) {
        throw new AzureSpeechError("Audio TTS vượt quá giới hạn 2 MB.", 413);
      }
      return audio;
    } catch (error) {
      lastError = error;
      const retryable =
        error instanceof AzureSpeechError
          ? error.retryable
          : error instanceof TypeError ||
            (error instanceof DOMException && error.name === "TimeoutError");
      console.error("Azure Speech synthesis failed.", {
        attempt: attempt + 1,
        retryable,
        status: error instanceof AzureSpeechError ? error.status : undefined,
        message: error instanceof Error ? error.message : "unknown_error",
      });
      if (!retryable || attempt === 2) throw error;
      await wait(retryDelay(attempt));
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new AzureSpeechError("Azure Speech không phản hồi.");
}
