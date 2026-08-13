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

    const libraryLink = screen.getByRole("link", { name: "Thư viện học" });
    expect(libraryLink.getAttribute("href")).toBe("/#thu-vien");
    expect(libraryLink.className).toContain("font-black");

    expect(screen.getAllByRole("link", { name: /Mở bộ [123]/ })).toHaveLength(3);
    expect(screen.queryByRole("button", { name: /Quyển/ })).toBeNull();
    expect(container.querySelector("[data-home-viewport='fixed-desktop']")).toBeTruthy();
    expect(container.querySelector("[data-home-series-grid='full-width']")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Xem toàn bộ →" })).toBeNull();
  });
});
