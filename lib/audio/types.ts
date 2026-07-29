export type TtsProvider = "azure";

export type TtsConfig = {
  provider: TtsProvider;
  endpoint: string;
  key: string;
  voice: string;
  rate: string;
  outputFormat: string;
};

export type AudioGenerationResult = {
  audioUrl: string;
  cached: boolean;
  provider: TtsProvider;
  voice: string;
};
