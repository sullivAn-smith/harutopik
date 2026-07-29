import "server-only";

import type { TtsConfig } from "./types";

export const azureProvider = "azure" as const;
export const defaultAzureVoice = "ko-KR-SunHiNeural";
export const defaultAzureRate = "-12%";
export const defaultAzureOutputFormat =
  "audio-24khz-48kbitrate-mono-mp3";

function synthesisEndpoint(endpoint: string) {
  const value = endpoint.trim().replace(/\/+$/, "");
  if (value.endsWith("/cognitiveservices/v1")) return value;

  const parsed = new URL(value);
  const cognitiveMatch = parsed.hostname.match(
    /^([a-z0-9-]+)\.api\.cognitive\.microsoft\.com$/i,
  );
  if (cognitiveMatch) {
    return `https://${cognitiveMatch[1]}.tts.speech.microsoft.com/cognitiveservices/v1`;
  }
  return `${value}/cognitiveservices/v1`;
}

export function getAzureTtsConfig(): TtsConfig {
  const key =
    process.env.AZURE_SPEECH_KEY?.trim() ||
    process.env.SPEECH_KEY?.trim() ||
    "";
  const rawEndpoint =
    process.env.AZURE_SPEECH_ENDPOINT?.trim() ||
    process.env.SPEECH_ENDPOINT?.trim() ||
    "";
  if (!key || !rawEndpoint) {
    throw new Error(
      "Thiếu AZURE_SPEECH_KEY hoặc AZURE_SPEECH_ENDPOINT.",
    );
  }

  return {
    provider: azureProvider,
    endpoint: synthesisEndpoint(rawEndpoint),
    key,
    voice:
      process.env.AZURE_SPEECH_VOICE?.trim() || defaultAzureVoice,
    rate: process.env.AZURE_SPEECH_RATE?.trim() || defaultAzureRate,
    outputFormat:
      process.env.AZURE_SPEECH_OUTPUT_FORMAT?.trim() ||
      defaultAzureOutputFormat,
  };
}

export function isAzureTtsConfigured() {
  return Boolean(
    (process.env.AZURE_SPEECH_KEY || process.env.SPEECH_KEY) &&
      (process.env.AZURE_SPEECH_ENDPOINT || process.env.SPEECH_ENDPOINT),
  );
}
