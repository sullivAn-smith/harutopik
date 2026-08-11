// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { curriculumSeriesDefinitions } from "@/lib/catalog/curriculum-series";
import {
  CurriculumSeriesLibrary,
  type CurriculumBook,
} from "./curriculum-series-library";

afterEach(cleanup);

const books: CurriculumBook[] = [
  {
    number: 1,
    status: "published",
    courseSlug: "topik-1",
    lessons: [
      { id: "lesson-1", slug: "bai-1", order: 1, title: "Giới thiệu bản thân" },
    ],
  },
  {
    number: 2,
    status: "published",
    courseSlug: "topik-2",
    lessons: [
      { id: "lesson-2", slug: "bai-2", order: 1, title: "Gia đình" },
    ],
  },
  { number: 3, status: "locked", courseSlug: null, lessons: [] },
];

describe("CurriculumSeriesLibrary", () => {
  it("opens only one published book at a time and collapses it on a second click", () => {
    render(
      <CurriculumSeriesLibrary
        series={curriculumSeriesDefinitions[0]}
        books={books}
      />,
    );

    expect(screen.getAllByRole("button", { name: /Quyển [123]/ })).toHaveLength(3);

    fireEvent.click(screen.getByRole("button", { name: "Quyển 1" }));
    expect(screen.getByRole("link", { name: /Bài 1.*Giới thiệu bản thân/ }).getAttribute("href"))
      .toBe("/courses/topik-1/lessons/bai-1");

    fireEvent.click(screen.getByRole("button", { name: "Quyển 2" }));
    expect(screen.queryByText("Giới thiệu bản thân")).toBeNull();
    expect(screen.getByRole("link", { name: /Bài 1.*Gia đình/ })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Quyển 2" }));
    expect(screen.queryByRole("link", { name: /Bài 1.*Gia đình/ })).toBeNull();
  });

  it("keeps locked books visible without exposing lesson links", () => {
    render(
      <CurriculumSeriesLibrary
        series={curriculumSeriesDefinitions[0]}
        books={books}
      />,
    );

    const lockedBook = screen.getByRole("button", { name: "Quyển 3" });
    expect(lockedBook.getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByText("Sắp ra mắt")).toBeTruthy();
  });

  it("presents published and locked books as clear modern book cards", () => {
    const { container } = render(
      <CurriculumSeriesLibrary
        series={curriculumSeriesDefinitions[0]}
        books={books}
      />,
    );

    expect(container.querySelectorAll("[data-book-card]")).toHaveLength(3);
    expect(container.querySelectorAll("[data-book-cover]")).toHaveLength(3);
    expect(screen.getAllByText("Xem bài học")).toHaveLength(2);
    expect(container.querySelector("[data-book-state='locked']")).toBeTruthy();
  });

  it("uses a soft blue treatment for expanded lesson rows", () => {
    const { container } = render(
      <CurriculumSeriesLibrary
        series={curriculumSeriesDefinitions[0]}
        books={books}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Quyển 1" }));
    const lessonLink = container.querySelector("[data-lesson-link]");

    expect(lessonLink?.className).toContain("from-[#edf9ff]");
    expect(lessonLink?.className).toContain("border-sky-300/85");
  });
});
