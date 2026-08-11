// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { curriculumSeriesDefinitions } from "@/lib/catalog/curriculum-series";
import { CurriculumSeriesCover } from "./curriculum-series-cover";

afterEach(cleanup);

describe("CurriculumSeriesCover", () => {
  it("keeps the original TOPIK artwork on series 1", () => {
    const series = curriculumSeriesDefinitions[0];
    render(<CurriculumSeriesCover series={series} />);

    const link = screen.getByRole("link", { name: "Mở bộ 1" });
    expect(link.getAttribute("href")).toBe("/thu-vien/1");
    expect(link.getAttribute("data-cover-variant")).toBe("topik-original");
    expect(screen.getByText("TOPIK")).toBeTruthy();
    expect(link.textContent).toContain("Nền tảng chongười Việt");
    expect(screen.getByText("HỌC NGAY")).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();
  });

  it.each(curriculumSeriesDefinitions.slice(1))(
    "opens series $id using a numbered cover without a curriculum name",
    (series) => {
      render(<CurriculumSeriesCover series={series} />);

      const link = screen.getByRole("link", { name: `Mở bộ ${series.id}` });
      expect(link.getAttribute("href")).toBe(series.href);
      expect(link.textContent?.trim()).toBe(series.id);
      expect(link.getAttribute("data-theme")).toBe(series.theme);
      expect(screen.queryByText(/TOPIK/i)).toBeNull();
    },
  );
});
