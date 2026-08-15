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
    expect(link.getAttribute("data-cover-variant")).toBe("reference-1");
    expect(screen.getByText("Bộ sách")).toBeTruthy();
    expect(screen.getByText("TOPIK")).toBeTruthy();
    expect(link.textContent).toContain("Nền tảng cho\nngười Việt");
    expect(screen.getByText("HỌC NGAY")).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();
  });

  it.each(curriculumSeriesDefinitions.slice(1))(
    "opens series $id using its reference cover and curriculum name",
    (series) => {
      render(<CurriculumSeriesCover series={series} />);

      const link = screen.getByRole("link", { name: `Mở bộ ${series.id}` });
      expect(link.getAttribute("href")).toBe(series.href);
      expect(link.textContent).toContain("Bộ sách");
      expect(link.textContent).toContain(series.id);
      expect(link.getAttribute("data-theme")).toBe(series.theme);
      expect(link.getAttribute("data-cover-variant")).toBe(`reference-${series.id}`);
      expect(link.textContent).toContain(series.id === "2" ? "서울 한국어" : "세종 한국어");
      expect(screen.getByText("HỌC NGAY")).toBeTruthy();
    },
  );
});
