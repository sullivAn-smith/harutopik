// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LessonProgressSnapshot } from "@/lib/learning-core/lesson-progress";
import {
  LessonProgressDialog,
  RestartLessonDialog,
} from "./lesson-status-dialogs";

afterEach(cleanup);

const progress: LessonProgressSnapshot = {
  completionPercent: 62,
  unlockThreshold: 100,
  speedTestUnlocked: false,
  unlockedAt: null,
  bestPracticeAccuracy: 70,
  completedModes: ["grammar", "quiz"],
  components: {
    vocabulary: 80,
    grammar: 100,
    practice: 40,
    accuracy: 70,
  },
  recommendation: "Hoàn thành Gõ từ để tiến gần hơn đến Speed Test.",
  recommendedMode: "typing",
};

describe("lesson status dialogs", () => {
  it("hiển thị chi tiết tiến độ và CTA học tiếp khi Speed Test còn khóa", () => {
    const onContinue = vi.fn();
    render(
      <LessonProgressDialog
        open
        progress={progress}
        speedTestHref="/lesson/speed-test"
        onClose={vi.fn()}
        onContinue={onContinue}
      />,
    );

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Đã hoàn thành 62%")).toBeTruthy();
    expect(screen.getByText("Từ vựng")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Vào Speed Test/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Tiếp tục học" }));
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it("cho vào Speed Test khi quyền đã mở", () => {
    render(
      <LessonProgressDialog
        open
        progress={{
          ...progress,
          completionPercent: 100,
          speedTestUnlocked: true,
          unlockedAt: "2026-08-17T00:00:00.000Z",
        }}
        speedTestHref="/lesson/speed-test"
        onClose={vi.fn()}
        onContinue={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("link", { name: /Vào Speed Test/ }).getAttribute("href"),
    ).toBe("/lesson/speed-test");
  });

  it("cho người học giữ phiên hiện tại hoặc xác nhận học lại từ đầu", () => {
    const onClose = vi.fn();
    const onRestart = vi.fn();
    render(
      <RestartLessonDialog
        open
        onClose={onClose}
        onRestart={onRestart}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Học lại từ đầu" }));
    expect(onRestart).toHaveBeenCalledOnce();
  });
});
