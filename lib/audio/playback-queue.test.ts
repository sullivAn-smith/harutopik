import { beforeEach, describe, expect, it, vi } from "vitest";

class AudioMock {
  static instances: AudioMock[] = [];
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  readonly src: string;
  play = vi.fn().mockResolvedValue(undefined);

  constructor(src: string) {
    this.src = src;
    AudioMock.instances.push(this);
  }
}

describe("audio playback queue", () => {
  beforeEach(() => {
    vi.resetModules();
    AudioMock.instances = [];
    vi.stubGlobal("Audio", AudioMock);
  });

  it("bỏ qua các lần bấm lặp khi cùng audio đang phát", async () => {
    const { enqueueAudioPlayback } = await import("./playback-queue");

    const first = enqueueAudioPlayback({ audioUrl: "/word.mp3" });
    const second = enqueueAudioPlayback({ audioUrl: "/word.mp3" });
    const third = enqueueAudioPlayback({ audioUrl: "/word.mp3" });
    await Promise.resolve();
    await Promise.resolve();

    expect(first).toBe(second);
    expect(second).toBe(third);
    expect(AudioMock.instances).toHaveLength(1);

    AudioMock.instances[0].onended?.();
    await first;
  });

  it("chỉ bắt đầu audio tiếp theo sau khi audio trước kết thúc", async () => {
    const { enqueueAudioPlayback } = await import("./playback-queue");

    const first = enqueueAudioPlayback({ audioUrl: "/first.mp3" });
    const second = enqueueAudioPlayback({ audioUrl: "/second.mp3" });
    await Promise.resolve();
    await Promise.resolve();

    expect(AudioMock.instances.map((audio) => audio.src)).toEqual([
      "/first.mp3",
    ]);

    AudioMock.instances[0].onended?.();
    await first;
    await Promise.resolve();

    expect(AudioMock.instances.map((audio) => audio.src)).toEqual([
      "/first.mp3",
      "/second.mp3",
    ]);

    AudioMock.instances[1].onended?.();
    await second;
  });

  it("không dùng giọng thiết bị khi chưa có audio Azure", async () => {
    const speechSynthesis = { speak: vi.fn() };
    vi.stubGlobal("speechSynthesis", speechSynthesis);
    const { enqueueAudioPlayback } = await import("./playback-queue");

    await enqueueAudioPlayback({});

    expect(AudioMock.instances).toHaveLength(0);
    expect(speechSynthesis.speak).not.toHaveBeenCalled();
  });
});
