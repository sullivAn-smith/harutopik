// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LearningRoadmap } from "./learning-roadmap";

afterEach(cleanup);

describe("LearningRoadmap", () => {
  it("chuyển giữa tab chức năng và lộ trình, đồng thời mở thông tin giáo trình", () => {
    const { container } = render(<LearningRoadmap />);

    expect(container.querySelector("main")?.className).toContain("h-dvh");
    expect(container.querySelector("main")?.className).toContain("overflow-hidden");
    expect(screen.getByRole("heading", { name: "Lộ trình cho người mới" })).toBeTruthy();
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["Lộ trình", "Chức năng"]);
    expect(screen.getByRole("tab", { name: "Lộ trình" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("heading", { name: "Chọn hướng học phù hợp với bạn" })).toBeTruthy();
    expect(screen.queryByText(/Giai đoạn 0/)).toBeNull();
    expect(screen.queryByRole("link", { name: "Vào Speed Test →" })).toBeNull();
    expect(within(screen.getByLabelText("Chọn giáo trình tiếng Hàn")).getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual([
      "/thu-vien/1",
      "/thu-vien/2",
      "/thu-vien/3",
      "/courses/topik-1",
    ]);

    const seoulLevels = screen.getByRole("list", { name: "Các cấp độ của Giáo trình Seoul" });
    expect(seoulLevels.className).toContain("overflow-y-auto");
    expect(seoulLevels.className).toContain("[scrollbar-width:none]");

    fireEvent.click(screen.getByRole("button", { name: "Tìm hiểu thêm về Giáo trình Seoul" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeTruthy();
    expect(dialog.className).toContain("overflow-y-auto");
    expect(dialog.className).toContain("[scrollbar-width:none]");
    expect(within(dialog).getByRole("heading", { name: /Giáo trình Seoul/ })).toBeTruthy();
    expect(dialog.className).toContain("bg-emerald-50");
    expect(within(dialog).getByRole("link", { name: "Học ngay →" }).getAttribute("href")).toBe("/thu-vien/2");

    fireEvent.click(screen.getByRole("button", { name: "Đóng thông tin giáo trình" }));
    fireEvent.click(screen.getByRole("tab", { name: "Chức năng" }));
    expect(screen.getByRole("tab", { name: "Chức năng" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("heading", { name: "Một vòng học hoàn chỉnh" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Vào Speed Test →" }).getAttribute("href")).toBe("/speed-test");
    expect(screen.getByRole("list", { name: "Các chức năng trong vòng học" }).className).toContain("items-start");
  });
});
