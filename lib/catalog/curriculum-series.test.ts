import { describe, expect, it } from "vitest";

import {
  curriculumSeriesDefinitions,
  getCurriculumSeries,
} from "./curriculum-series";

describe("curriculum series catalog", () => {
  it("maps the three learner series to their fixed book counts and themes", () => {
    expect(curriculumSeriesDefinitions).toEqual([
      expect.objectContaining({ id: "1", bookCount: 6, theme: "blue", href: "/thu-vien/1" }),
      expect.objectContaining({ id: "2", bookCount: 6, theme: "cyan", href: "/thu-vien/2" }),
      expect.objectContaining({ id: "3", bookCount: 8, theme: "green", href: "/thu-vien/3" }),
    ]);
  });

  it("does not resolve an unsupported series route", () => {
    expect(getCurriculumSeries("4")).toBeUndefined();
    expect(getCurriculumSeries("")).toBeUndefined();
  });
});
