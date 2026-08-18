// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { SpeedTestArena } from "./speed-test-arena";

afterEach(cleanup);

describe("SpeedTestArena", () => {
  it("chọn bài học trước khi mở Typing Sprint từ Arena tổng", () => {
    render(<SpeedTestArena audioLessons={[{
      id: "lesson-typing",
      courseSlug: "topik-1",
      lessonSlug: "bai-5",
      name: "Bài 5: Công việc hằng ngày",
    }]} />);

    fireEvent.click(screen.getByRole("button", { name: /Chơi Typing Sprint/ }));

    expect(screen.getByRole("heading", { name: "Chọn bài học" })).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /Bài 5: Công việc hằng ngày/ }).getAttribute("href"),
    ).toBe("/courses/topik-1/lessons/bai-5/speed-test?game=typing");
  });

  it("chuyển tiếp Daily Challenge vào Typing của bài học", () => {
    render(<SpeedTestArena initialGame="typing" typingDailyMode audioLessons={[{
      id: "lesson-daily",
      courseSlug: "topik-1",
      lessonSlug: "bai-1",
      name: "Bài 1: Giới thiệu",
    }]} />);

    expect(
      screen.getByRole("link", { name: /Bài 1: Giới thiệu/ }).getAttribute("href"),
    ).toBe("/courses/topik-1/lessons/bai-1/speed-test?game=typing&daily=1");
  });

  it("giữ Typing Sprint cũ và Audio Reaction thành hai game riêng", () => {
    render(<SpeedTestArena typingGame={<div>Typing game cũ</div>} audioGame={<div>Audio game mới</div>} />);
    expect(screen.getByRole("heading", { name: "Chọn thử thách phản xạ" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Chơi Typing Sprint/ }));
    expect(screen.getByText("Typing game cũ")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Mở bàn phím Hàn Việt" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /AUDIO/ }));
    expect(screen.getByText("Audio game mới")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Mở bàn phím Hàn Việt" })).toBeTruthy();
  });

  it("liệt kê lesson Audio Reaction từ Arena tổng", () => {
    render(<SpeedTestArena typingGame={<div>Typing</div>} audioLessons={[{
      id: "lesson-1",
      courseSlug: "topik-1",
      lessonSlug: "bai-1",
      name: "Bài 1: Giới thiệu",
      audioCount: 14,
    }]} />);
    fireEvent.click(screen.getByRole("button", { name: /Chơi Audio Reaction/ }));
    expect(screen.queryByRole("heading", { name: "Chọn thử thách phản xạ" })).toBeNull();
    expect(screen.getByRole("heading", { name: "Chọn bài học" })).toBeTruthy();
    const lesson = screen.getByRole("link", { name: /Bài 1: Giới thiệu/ });
    expect(lesson.getAttribute("href")).toBe("/courses/topik-1/lessons/bai-1/speed-test?game=audio");
  });

  it("không cần tải toàn bộ vocabulary để liệt kê lesson trong Arena", () => {
    render(<SpeedTestArena typingGame={<div>Typing</div>} audioLessons={[{
      id: "lesson-2",
      courseSlug: "topik-1",
      lessonSlug: "bai-2",
      name: "Bài 2: Trường học",
    }]} />);
    fireEvent.click(screen.getByRole("button", { name: /Chơi Audio Reaction/ }));
    expect(screen.getByText("🎧 Mở bài học để kiểm tra audio khả dụng")).toBeTruthy();
  });

  it("mở Flash Recall thành màn hình chọn lesson riêng", () => {
    render(<SpeedTestArena typingGame={<div>Typing</div>} audioLessons={[{
      id: "lesson-3",
      courseSlug: "topik-1",
      lessonSlug: "bai-3",
      name: "Bài 3: Sinh hoạt hằng ngày",
    }]} />);
    fireEvent.click(screen.getByRole("button", { name: /Chơi Flash Recall/ }));
    expect(screen.getByRole("heading", { name: "Chọn bài học" })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Bài 3: Sinh hoạt hằng ngày/ }).getAttribute("href"))
      .toBe("/courses/topik-1/lessons/bai-3/speed-test?game=flash");
  });

  it("mở Card Reaction thành màn hình chọn lesson riêng", () => {
    render(<SpeedTestArena typingGame={<div>Typing</div>} audioLessons={[{
      id: "lesson-4", courseSlug: "topik-1", lessonSlug: "bai-4", name: "Bài 4: Ngày và Thứ",
    }]} />);
    fireEvent.click(screen.getByRole("button", { name: /Chơi Card Reaction/ }));
    expect(screen.getByRole("link", { name: /Bài 4: Ngày và Thứ/ }).getAttribute("href"))
      .toBe("/courses/topik-1/lessons/bai-4/speed-test?game=card");
  });

  it("đưa bài chưa mở khóa về màn học thay vì vào Speed Test", () => {
    render(<SpeedTestArena initialGame="typing" audioLessons={[{
      id: "lesson-locked",
      courseSlug: "topik-1",
      lessonSlug: "bai-khoa",
      name: "Bài khóa",
      completionPercent: 62,
      speedTestUnlocked: false,
    }]} />);

    const lesson = screen.getByRole("link", { name: /Bài khóa/ });
    expect(lesson.getAttribute("href"))
      .toBe("/courses/topik-1/lessons/bai-khoa?speedTest=locked");
    expect(screen.getByText("🔒 62%")).toBeTruthy();
    expect(screen.getByText("Học bài và đạt 75% tiến độ để mở thử thách."))
      .toBeTruthy();
  });
});
