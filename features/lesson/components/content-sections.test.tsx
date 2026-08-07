// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { lessonOne } from "@/content/courses/topik-1/lessons/lesson-01";
import { GrammarSection } from "./grammar-section";
import { VocabularyList } from "./vocabulary-list";

afterEach(cleanup);

describe("VocabularyList", () => {
  it("hiển thị từ loại thật từ dữ liệu thay vì nhãn ghi cứng", () => {
    const item = {
      ...lessonOne.vocabulary[0],
      partOfSpeech: "Động từ",
    };

    render(
      <VocabularyList
        lessonId={lessonOne.id}
        items={[item]}
        query=""
        onQueryChange={vi.fn()}
        onSpeak={vi.fn()}
      />,
    );

    expect(screen.getByText("Động từ")).toBeTruthy();
    expect(screen.queryByText("Danh từ")).toBeNull();
  });

  it("gửi URL audio CDN khi phát âm từ vựng", () => {
    const onSpeak = vi.fn();
    const item = {
      ...lessonOne.vocabulary[0],
      audioUrl: "https://cdn.example/azure-word.mp3",
    };
    render(
      <VocabularyList
        lessonId={lessonOne.id}
        items={[item]}
        query=""
        onQueryChange={vi.fn()}
        onSpeak={onSpeak}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: `Phát âm ${item.korean}` }),
    );
    expect(onSpeak).toHaveBeenCalledWith(item.korean, item.audioUrl);
  });

  it("gửi URL audio CDN khi phát câu ví dụ", () => {
    const onSpeak = vi.fn();
    const item = {
      ...lessonOne.vocabulary[0],
      examples: [
        {
          ...lessonOne.vocabulary[0].examples[0],
          audioUrl: "https://cdn.example/azure-example.mp3",
        },
      ],
    };
    render(
      <VocabularyList
        lessonId={lessonOne.id}
        items={[item]}
        query=""
        onQueryChange={vi.fn()}
        onSpeak={onSpeak}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: `Phát âm ví dụ ${item.korean}` }),
    );
    expect(onSpeak).toHaveBeenCalledWith(
      item.examples[0].korean,
      item.examples[0].audioUrl,
    );
  });

  it("chỉ hiện 10 từ đầu và cho xem thêm từng 10 từ", () => {
    render(
      <VocabularyList
        lessonId={lessonOne.id}
        items={lessonOne.vocabulary}
        query=""
        onQueryChange={vi.fn()}
        onSpeak={vi.fn()}
      />,
    );

    expect(screen.getByText("10/55 từ", { exact: false })).toBeTruthy();
    expect(screen.queryByText("필리핀")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Xem thêm 10 từ ↓" }));
    expect(screen.getByText("필리핀")).toBeTruthy();
    expect(screen.getByText("20/55 từ", { exact: false })).toBeTruthy();
  });

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
    const grammar = lessonOne.grammar.map((item, index) =>
      index === 0
        ? {
            ...item,
            examples: item.examples.map((example, exampleIndex) =>
              exampleIndex === 0
                ? {
                    ...example,
                    audioUrl: "https://cdn.example/azure-grammar.mp3",
                  }
                : example,
            ),
          }
        : item,
    );
    render(
      <GrammarSection
        grammar={grammar}
        exercises={exercises}
        onSpeak={onSpeak}
        onFeedback={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Phát âm 저는 민수입니다." }),
    );

    expect(onSpeak).toHaveBeenCalledWith(
      "저는 민수입니다.",
      "https://cdn.example/azure-grammar.mp3",
    );
  });
});
