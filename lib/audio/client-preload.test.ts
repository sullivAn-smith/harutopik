// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";

import { promoteAudioPreload, releaseAudio } from "./client-preload";

describe("client audio preload lifecycle", () => {
  it("chỉ nâng audio kế tiếp lên auto khi được yêu cầu", () => {
    const audio = document.createElement("audio");
    audio.preload = "none";
    audio.load = vi.fn();

    promoteAudioPreload(audio);

    expect(audio.preload).toBe("auto");
    expect(audio.load).toHaveBeenCalledOnce();
  });

  it("hủy nguồn media khi rời màn hình", () => {
    const audio = document.createElement("audio");
    audio.src = "/word.mp3";
    audio.pause = vi.fn();
    audio.load = vi.fn();

    releaseAudio(audio);

    expect(audio.pause).toHaveBeenCalledOnce();
    expect(audio.hasAttribute("src")).toBe(false);
    expect(audio.load).toHaveBeenCalledOnce();
  });
});
