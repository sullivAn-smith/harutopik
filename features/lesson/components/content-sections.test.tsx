// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { lessonOne } from "@/content/courses/topik-1/lessons/lesson-01";
import { GrammarSection } from "./grammar-section";
import { VocabularyList } from "./vocabulary-list";

afterEach(cleanup);

describe("VocabularyList", () => {
  it("tìm kiếm theo tiếng Việt mà vẫn giữ số thứ tự nguồn", () => {
    render(
      <VocabularyList
        lessonId={lessonOne.id}
        items={lessonOne.vocabulary}
        query="Việt Nam"
        onQueryChange={vi.fn()}
        onSpeak={vi.fn()}
      />,
    );

    expect(screen.getByText("베트남")).toBeTruthy();
    expect(screen.getByText("2.")).toBeTruthy();
    expect(screen.queryByText("한국")).toBeNull();
  });

  it("hiển thị trạng thái rỗng khi không có kết quả", () => {
    render(
      <VocabularyList
        lessonId={lessonOne.id}
        items={lessonOne.vocabulary}
        query="không tồn tại"
        onQueryChange={vi.fn()}
        onSpeak={vi.fn()}
      />,
    );

    expect(screen.getByText(/Không tìm thấy từ phù hợp/)).toBeTruthy();
  });
});

describe("GrammarSection", () => {
  const exercises = lessonOne.exercises.filter(
    (exercise) => exercise.type === "fill-blank",
  );

  it("chấm đúng câu điền ngữ pháp", () => {
    const onFeedback = vi.fn();
    render(
      <GrammarSection
        grammar={lessonOne.grammar}
        exercises={exercises}
        onSpeak={vi.fn()}
        onFeedback={onFeedback}
      />,
    );

    const inputs = screen.getAllByPlaceholderText("Nhập đáp án");
    fireEvent.change(inputs[0], { target: { value: "입니다." } });
    fireEvent.click(screen.getAllByRole("button", { name: "Kiểm tra" })[0]);

    expect(onFeedback).toHaveBeenCalledWith(true);
    expect(screen.getByText("✓ Chính xác!")).toBeTruthy();
  });

  it("gọi phát âm đúng ví dụ được chọn", () => {
    const onSpeak = vi.fn();
    render(
      <GrammarSection
        grammar={lessonOne.grammar}
        exercises={exercises}
        onSpeak={onSpeak}
        onFeedback={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Phát âm 저는 민수입니다." }),
    );

    expect(onSpeak).toHaveBeenCalledWith("저는 민수입니다.");
  });
});
