// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VocabularyListAudioButton } from "./vocabulary-list-audio-button";

const generate = vi.fn();
const play = vi.fn();

vi.mock("@/features/vocabulary-admin/use-vocabulary-tts", () => ({
  useVocabularyTts: vi.fn(() => ({
    status: "idle",
    message: "",
    audioUrl: "",
    generate,
    play,
  })),
}));

afterEach(() => {
  cleanup();
  generate.mockReset();
  play.mockReset();
});

describe("VocabularyListAudioButton", () => {
  it("cho tạo audio ngay trên dòng khi từ chưa có audio", () => {
    render(<VocabularyListAudioButton vocabularyId="word-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Tạo audio" }));

    expect(generate).toHaveBeenCalledOnce();
  });

  it("chỉ hiện nghe thử khi từ đã có audio", () => {
    render(
      <VocabularyListAudioButton
        vocabularyId="word-1"
        currentAudioUrl="https://cdn.example/audio.mp3"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "▶ Nghe thử" }));

    expect(play).toHaveBeenCalledWith("https://cdn.example/audio.mp3");
    expect(screen.queryByRole("button", { name: "Tạo audio" })).toBeNull();
  });
});
