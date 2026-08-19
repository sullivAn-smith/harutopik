// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: vi.fn(() => new Promise(() => undefined)),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  }),
}));

import { HomeClient } from "./home-client";

afterEach(cleanup);

describe("HomeClient library navigation", () => {
  it("uses a bold library link and shows exactly three numbered series covers", () => {
    const { container } = render(<HomeClient initialCourses={[]} />);

    expect(screen.queryByRole("link", { name: "Thư viện học" })).toBeNull();
    expect(container.querySelector(".sidebar-shell")?.textContent).not.toContain("Trang chủ");
    expect(screen.getByRole("link", { name: "Lộ trình" }).getAttribute("href")).toBe("/lo-trinh");
    expect(screen.queryByText("Sắp ra mắt")).toBeNull();
    expect(screen.getByRole("link", { name: "Quản lý bộ ngữ pháp" }).getAttribute("href")).toBe("/ngu-phap-cua-toi");

    expect(screen.getAllByRole("link", { name: /Mở bộ [123]/ })).toHaveLength(3);
    expect(screen.queryByRole("button", { name: /Quyển/ })).toBeNull();
    expect(container.querySelector("[data-home-viewport='fixed-desktop']")).toBeTruthy();
    expect(container.querySelector("[data-home-series-grid='full-width']")).toBeTruthy();
    expect(container.querySelector(".home-landing")?.className).toContain("lg:grid-cols-[16rem_minmax(0,1fr)]");
    expect(container.querySelector(".sidebar-shell")?.className).toContain("lg:sticky");
    expect(container.querySelector(".home-desktop-content")?.className).toContain("min-w-0");
    expect(container.querySelector(".home-desktop-content")?.className).not.toContain("max-w-");
    expect(container.querySelector(".home-desktop-content")?.className).not.toContain("lg:ml-64");
    expect(screen.queryByRole("link", { name: "Xem toàn bộ →" })).toBeNull();
  });
});
