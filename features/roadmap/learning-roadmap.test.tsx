// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LearningRoadmap } from "./learning-roadmap";

afterEach(cleanup);

describe("LearningRoadmap", () => {
  it("dẫn tới đúng ba giáo trình và mở thông tin tìm hiểu thêm", () => {
    render(<LearningRoadmap />);

    expect(screen.getByRole("heading", { name: "Nhập môn tiếng Hàn (2–3 tuần)" })).toBeTruthy();
    expect(screen.queryByText(/Giai đoạn 0/)).toBeNull();
    expect(screen.getByLabelText("Sơ đồ chia ba giáo trình")).toBeTruthy();
    expect(screen.queryByText("HỌC NGAY")).toBeNull();
    expect(screen.getAllByRole("link", { name: "Học ngay →" }).map((link) => link.getAttribute("href"))).toEqual([
      "/thu-vien/1",
      "/thu-vien/2",
      "/thu-vien/3",
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Tìm hiểu thêm về Giáo trình Seoul" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeTruthy();
    expect(within(dialog).getByRole("heading", { name: /Giáo trình Seoul/ })).toBeTruthy();
    expect(dialog.className).toContain("bg-emerald-50");
    expect(screen.getAllByRole("link", { name: "Học ngay →" }).at(-1)?.getAttribute("href")).toBe("/thu-vien/2");
  });
});
