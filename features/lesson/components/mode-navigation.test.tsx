// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LessonProgressSnapshot } from "@/lib/learning-core/lesson-progress";
import { ModeNavigation } from "./mode-navigation";

afterEach(cleanup);

const lockedProgress: LessonProgressSnapshot = {
  completionPercent: 62,
  unlockThreshold: 100,
  speedTestUnlocked: false,
  unlockedAt: null,
  bestPracticeAccuracy: 60,
  completedModes: ["quiz"],
  components: {
    vocabulary: 80,
    grammar: 100,
    practice: 20,
    accuracy: 60,
  },
  recommendation: "Hoàn thành Gõ từ.",
  recommendedMode: "typing",
};

describe("ModeNavigation Speed Test progress", () => {
  it("hiển thị nút khóa và chuyển người học đến phần được gợi ý", () => {
    const onLockedSpeedTestClick = vi.fn();
    render(
      <ModeNavigation
        activeMode="flashcard"
        availableModes={["flashcard", "quiz", "typing"]}
        onChange={vi.fn()}
        speedTestHref="/lesson/speed-test"
        speedTestProgress={lockedProgress}
        onLockedSpeedTestClick={onLockedSpeedTestClick}
      />,
    );

    expect(screen.queryByRole("link", { name: /Speed Test Arena/ })).toBeNull();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Speed Test chưa mở, tiến độ 62%",
      }),
    );
    expect(onLockedSpeedTestClick).toHaveBeenCalledOnce();
  });

  it("đổi thành liên kết khi quyền Speed Test đã được mở vĩnh viễn", () => {
    render(
      <ModeNavigation
        activeMode="flashcard"
        availableModes={["flashcard", "quiz"]}
        onChange={vi.fn()}
        speedTestHref="/lesson/speed-test"
        speedTestProgress={{
          ...lockedProgress,
          completionPercent: 100,
          speedTestUnlocked: true,
          unlockedAt: "2026-08-17T00:00:00.000Z",
        }}
      />,
    );

    expect(
      screen.getByRole("link", { name: /Speed Test Arena/ }).getAttribute("href"),
    ).toBe("/lesson/speed-test");
  });
});
