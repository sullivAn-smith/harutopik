// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Lesson } from "@/content/schema";
import { PublishedLessonHotfixForm } from "./published-lesson-hotfix-form";

vi.mock("./hotfix-actions", () => ({
  applyPublishedLessonHotfix: vi.fn(async () => ({ status: "idle" })),
}));

const clearPublishedLessonVocabularyImages = vi.fn(async (
  _lessonId: string,
  _vocabularyIds: string[],
) => {
  void _lessonId;
  void _vocabularyIds;
  return {
    ok: true as const,
    clearedCount: 1,
    message: "Đã xoá ảnh của 1 từ và đồng bộ cho biên tập, học viên.",
  };
});

vi.mock("./bulk-vocabulary-image-actions", () => ({
  clearPublishedLessonVocabularyImages: (...args: [string, string[]]) =>
    clearPublishedLessonVocabularyImages(...args),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
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
  it("cho xoá ảnh hàng loạt của các từ đã chọn mà không gỡ từ khỏi bài", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<PublishedLessonHotfixForm lesson={lesson} />);

    fireEvent.click(screen.getByRole("checkbox", { name: "Chọn từ 학교" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Xoá ảnh đã chọn" }),
    );

    expect(window.confirm).toHaveBeenCalledWith(
      "Xoá ảnh flashcard của 1 từ đã chọn? Ảnh sẽ mất ở admin, biên tập và trang học viên; bạn vẫn có thể mở từng từ để thêm ảnh mới.",
    );
    await vi.waitFor(() =>
      expect(clearPublishedLessonVocabularyImages).toHaveBeenCalledWith(
        "lesson-hotfix-test",
        ["word-1"],
      ),
    );
    expect(
      await screen.findByText(
        "Đã xoá ảnh của 1 từ và đồng bộ cho biên tập, học viên.",
      ),
    ).toBeTruthy();
    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
  });

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

describe("PublishedLessonHotfixForm dictation editing", () => {
  it("cho tạo câu chính tả khi bài phát hành chưa có câu nào", () => {
    vi.stubGlobal("crypto", { randomUUID: () => "dictation-test-id" });
    const { container } = render(
      <PublishedLessonHotfixForm lesson={lesson} />,
    );

    fireEvent.click(
      screen.getAllByRole("button", { name: "Mở rộng (0) ↓" })[0],
    );
    expect(screen.getByText("Chưa có câu chính tả")).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", { name: "+ Thêm câu chính tả" }),
    );

    expect(screen.getByText("1/15 câu chính tả")).toBeTruthy();
    const addButton = screen.getByRole("button", {
      name: "+ Thêm câu chính tả",
    });
    const dictationSection = addButton.closest("section");
    const sentenceInput = dictationSection?.querySelector<HTMLInputElement>(
      'article input[lang="ko"]',
    );
    expect(sentenceInput).toBeTruthy();
    fireEvent.change(sentenceInput!, { target: { value: "학교에 학생이 있습니다." } });

    const serialized = container.querySelector<HTMLInputElement>(
      'input[name="dictationsJson"]',
    )?.value;
    expect(serialized).toContain("학교에 학생이 있습니다.");
    expect(serialized).toContain("lesson-hotfix-test-dictation-hotfix-dictation-test-id");
  });
});

describe("PublishedLessonHotfixForm translation editing", () => {
  it("cho tạo câu Dịch câu và thu gọn hai khu vực bài tập", () => {
    vi.stubGlobal("crypto", { randomUUID: () => "translation-test-id" });
    const { container } = render(
      <PublishedLessonHotfixForm lesson={lesson} />,
    );

    const initiallyCollapsed = screen.getAllByRole("button", {
      name: "Mở rộng (0) ↓",
    });
    expect(initiallyCollapsed).toHaveLength(2);
    fireEvent.click(initiallyCollapsed[1]);
    fireEvent.click(screen.getByRole("button", { name: "+ Thêm câu dịch" }));
    const translationSection = screen
      .getByRole("button", { name: "+ Thêm câu dịch" })
      .closest("section");
    const translationInputs = translationSection?.querySelectorAll("textarea");
    expect(translationInputs).toHaveLength(4);
    fireEvent.change(translationInputs![0], {
      target: { value: "Tôi đi đến trường." },
    });
    fireEvent.change(translationInputs![1], {
      target: { value: "저는 학교에 가요." },
    });

    const serialized = container.querySelector<HTMLInputElement>(
      'input[name="translationsJson"]',
    )?.value;
    expect(serialized).toContain("Tôi đi đến trường.");
    expect(serialized).toContain("저는 학교에 가요.");

    const collapseButton = screen.getByRole("button", { name: "Thu gọn ↑" });
    fireEvent.click(collapseButton);
    expect(screen.getByRole("button", { name: "Mở rộng (1) ↓" })).toBeTruthy();
  });

  it("báo đã đủ khi chính tả và Dịch câu đều có 15 câu", () => {
    const fullLesson: Lesson = {
      ...lesson,
      exercises: Array.from({ length: 15 }, (_, index) => [
        {
          id: `dictation-${index}`,
          type: "dictation" as const,
          sentence: `받아쓰기 문장 ${index + 1}`,
          points: 1,
        },
        {
          id: `translation-${index}`,
          type: "translation" as const,
          vietnamese: `Câu dịch ${index + 1}`,
          korean: `번역 문장 ${index + 1}`,
          acceptedVietnameseAnswers: [],
          acceptedKoreanAnswers: [],
          points: 1,
        },
      ]).flat(),
    };

    render(<PublishedLessonHotfixForm lesson={fullLesson} />);

    expect(screen.getAllByText("Đã đủ 15/15")).toHaveLength(2);
  });
});
