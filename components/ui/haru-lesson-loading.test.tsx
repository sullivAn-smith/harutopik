// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HaruLessonLoading, HaruLoadingMessage } from "./haru-lesson-loading";

describe("HaruLessonLoading", () => {
  it("thông báo rõ trạng thái chờ cho điều hướng và module bài học", () => {
    const { rerender } = render(<HaruLessonLoading />);

    expect(screen.getByRole("main").getAttribute("aria-busy")).toBe("true");
    expect(screen.getByRole("status", { name: "Haru đang chuẩn bị bài học" }))
      .toBeTruthy();
    expect(screen.getByText("Haru đang chuẩn bị bài học...")).toBeTruthy();

    rerender(<HaruLoadingMessage compact />);
    expect(screen.getByRole("status", { name: "Haru đang chuẩn bị bài học" }))
      .toBeTruthy();
  });
});
