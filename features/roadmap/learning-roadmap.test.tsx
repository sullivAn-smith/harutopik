// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LearningRoadmap } from "./learning-roadmap";

afterEach(cleanup);

describe("LearningRoadmap", () => {
  it("gộp toàn bộ vòng học vào một màn hình và mở thông tin giáo trình", () => {
    const { container } = render(<LearningRoadmap />);

    expect(container.querySelector("main")?.className).toContain("h-dvh");
    expect(container.querySelector("main")?.className).toContain("overflow-hidden");
    expect(screen.getByRole("heading", { name: "Lộ trình cho người mới" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Hangul → Giáo trình → Lưu phần khó → Speed Test → Luyện đề" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Bắt đầu Sơ cấp 1 →" }).getAttribute("href")).toBe("/courses/topik-1");
    expect(screen.getByRole("link", { name: "Xem bộ từ của tôi →" }).getAttribute("href")).toBe("/tu-cua-toi");
    expect(screen.getByRole("link", { name: "Vào Speed Test →" }).getAttribute("href")).toBe("/speed-test");
    expect(screen.getByRole("link", { name: "Xem đề luyện tập →" }).getAttribute("href")).toBe("/luyen-de");
    expect(screen.queryByText(/Giai đoạn 0/)).toBeNull();
    expect(within(screen.getByLabelText("Chọn giáo trình tiếng Hàn")).getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual([
      "/thu-vien/1",
      "/thu-vien/2",
      "/thu-vien/3",
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Tìm hiểu thêm về Giáo trình Seoul" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeTruthy();
    expect(within(dialog).getByRole("heading", { name: /Giáo trình Seoul/ })).toBeTruthy();
    expect(dialog.className).toContain("bg-emerald-50");
    expect(within(dialog).getByRole("link", { name: "Học ngay →" }).getAttribute("href")).toBe("/thu-vien/2");
  });
});
