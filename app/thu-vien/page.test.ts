import { beforeEach, describe, expect, it, vi } from "vitest";

const { redirect } = vi.hoisted(() => ({ redirect: vi.fn() }));

vi.mock("next/navigation", () => ({ redirect }));

import CurriculumLibraryPage from "./page";

describe("CurriculumLibraryPage", () => {
  beforeEach(() => redirect.mockClear());

  it("redirects the redundant selector page to the library section on Home", async () => {
    await CurriculumLibraryPage();

    expect(redirect).toHaveBeenCalledWith("/#thu-vien");
  });
});
