// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { enqueueAudioPlayback } from "@/lib/audio/playback-queue";
import { VocabularyExampleAudioButton } from "./vocabulary-example-audio-button";

vi.mock("@/lib/audio/playback-queue", () => ({
  enqueueAudioPlayback: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.mocked(enqueueAudioPlayback).mockReset();
});

describe("VocabularyExampleAudioButton", () => {
  it("tạo audio bằng endpoint riêng của câu ví dụ", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            audioUrl: "https://cdn.example/example.mp3",
            cached: false,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    render(
      <VocabularyExampleAudioButton
        vocabularyId="word-1"
        exampleId="example-1"
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Tạo audio ví dụ" }),
    );

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "▶ Nghe ví dụ" }),
      ).toBeTruthy(),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/vocabulary/word-1/examples/example-1/audio",
      { method: "POST" },
    );
  });

  it("phát audio ví dụ có sẵn mà không gọi API tạo mới", () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    render(
      <VocabularyExampleAudioButton
        vocabularyId="word-1"
        exampleId="example-1"
        currentAudioUrl="https://cdn.example/existing.mp3"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "▶ Nghe ví dụ" }));

    expect(enqueueAudioPlayback).toHaveBeenCalledWith({
      audioUrl: "https://cdn.example/existing.mp3",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
