// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Lesson } from "@/content/schema";
import { PublishedLessonHotfixForm } from "./published-lesson-hotfix-form";

vi.mock("./hotfix-actions", () => ({
  applyPublishedLessonHotfix: vi.fn(async () => ({ status: "idle" })),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const lesson: Lesson = {
  id: "lesson-hotfix-test",
  slug: "lesson-hotfix-test",
  courseId: "course-topik-1",
  moduleId: "module-topik-1",
  order: 1,
  version: 1,
  status: "published",
  title: { vi: "Bài đang phát hành", ko: "수업" },
  summary: "Bài học dùng để kiểm tra thao tác hotfix.",
  objectives: ["Kiểm tra hotfix"],
  vocabulary: [
    {
      id: "word-1",
      korean: "학교",
      vietnamese: "Trường học",
      romanization: "hak-gyo",
      category: "Trường học",
      examples: [],
    },
    {
      id: "word-2",
      korean: "학생",
      vietnamese: "Học sinh",
      romanization: "hak-saeng",
      category: "Trường học",
      examples: [],
    },
    {
      id: "word-3",
      korean: "선생님",
      vietnamese: "Giáo viên",
      romanization: "seon-saeng-nim",
      category: "Trường học",
      examples: [],
    },
  ],
  grammar: [],
  exercises: [],
};

describe("PublishedLessonHotfixForm vocabulary removal", () => {
  it("cho chọn từng từ, chọn tất cả, xác nhận gỡ và hoàn tác trước khi lưu", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const { container } = render(
      <PublishedLessonHotfixForm lesson={lesson} />,
    );

    fireEvent.click(
      screen.getByRole("checkbox", { name: "Chọn từ 학교" }),
    );
    expect(screen.getByText("Đã chọn 1 từ")).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", { name: "Chọn tất cả 3 từ" }),
    );
    expect(screen.getByText("Đã chọn 3 từ")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Gỡ khỏi bài" }));

    expect(window.confirm).toHaveBeenCalledWith(
      "Gỡ toàn bộ 3 từ khỏi bài đang phát hành? Các từ vẫn còn trong Thư viện từ.",
    );
    expect(
      screen.getByText(/Đã đánh dấu gỡ 3 từ/),
    ).toBeTruthy();
    expect(
      container.querySelector<HTMLInputElement>(
        'input[name="removedVocabularyIdsJson"]',
      )?.value,
    ).toBe('["word-1","word-2","word-3"]');

    fireEvent.click(screen.getByRole("button", { name: "Hoàn tác" }));

    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
    expect(
      container.querySelector<HTMLInputElement>(
        'input[name="removedVocabularyIdsJson"]',
      )?.value,
    ).toBe("[]");
  });
});
