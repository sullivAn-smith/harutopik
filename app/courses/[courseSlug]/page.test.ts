import { beforeEach, describe, expect, it, vi } from "vitest";

const { redirect } = vi.hoisted(() => ({ redirect: vi.fn() }));

vi.mock("next/navigation", () => ({ redirect }));

import CoursePage from "./page";

describe("CoursePage", () => {
  beforeEach(() => redirect.mockClear());

  it("redirects the removed course screen to the new curriculum library", async () => {
    await CoursePage({ params: Promise.resolve({ courseSlug: "topik-1" }) });

    expect(redirect).toHaveBeenCalledWith("/thu-vien/1");
  });
});
