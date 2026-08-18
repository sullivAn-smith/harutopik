// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GameMusicControl } from "./game-background-music";

afterEach(cleanup);

describe("GameMusicControl", () => {
  it("luôn đặt điều khiển âm lượng ở góc dưới bên trái", () => {
    render(
      <GameMusicControl
        enabled
        volume={0.18}
        toggle={vi.fn()}
        setVolume={vi.fn()}
      />,
    );

    const control = screen.getByRole("slider", {
      name: "Âm lượng nhạc nền",
    }).parentElement;

    expect(control?.className).toContain("fixed");
    expect(control?.className).toContain("bottom-4");
    expect(control?.className).toContain("left-4");
  });
});
