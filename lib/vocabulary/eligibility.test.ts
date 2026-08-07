import { describe, expect, it } from "vitest";
import type { Lesson, VocabularyItem } from "@/content/schema";
import { evaluateLessonEligibility } from "./eligibility";

function word(index: number, overrides: Partial<VocabularyItem> = {}): VocabularyItem {
  return {
    id: `word-${index}`,
    korean: `단어${index}`,
    vietnamese: `Nghĩa ${index}`,
    romanization: `daneo-${index}`,
    category: "Chung",
    examples: [],
    ...overrides,
  };
}

function report(vocabulary: VocabularyItem[], exercises: Lesson["exercises"] = []) {
  return evaluateLessonEligibility({ vocabulary, exercises });
}

describe("vocabulary eligibility", () => {
  it("bật flashcard, quiz và nối từ khi có 4 cặp phân biệt", () => {
    const result = report([word(1), word(2), word(3), word(4)]);
    expect(result.availableModes).toEqual(
      expect.arrayContaining(["flashcard", "quiz", "matching"]),
    );
    expect(result.canSubmit).toBe(true);
  });

  it("không bật nối từ nếu nghĩa bị trùng", () => {
    const result = report([
      word(1, { vietnamese: "Giống nhau" }),
      word(2, { vietnamese: "Giống nhau" }),
      word(3),
      word(4),
    ]);
    expect(result.availableModes).not.toContain("matching");
  });

  it("chỉ bật chính tả khi có audio Azure", () => {
    const withoutAudio = report([word(1)]);
    const withAudio = report([
      word(1, { audioUrl: "https://cdn.example/word.mp3" }),
    ]);
    expect(withoutAudio.availableModes).not.toContain("dictation");
    expect(
      withoutAudio.modes.find((mode) => mode.mode === "dictation")?.missing,
    ).toEqual([expect.stringContaining("Chưa có audio Azure")]);
    expect(withAudio.availableModes).toContain("dictation");
  });

  it("chỉ chấp nhận bài chính tả được biên soạn khi có audio Azure", () => {
    const result = report([word(1)], [
      {
        id: "dictation-1",
        type: "dictation",
        sentence: "안녕하세요",
        audioUrl: "https://cdn.example/dictation.mp3",
        acceptedAnswers: [],
        points: 1,
      },
    ]);
    expect(result.availableModes).toContain("dictation");
  });

  it("chặn gửi duyệt khi bài không có từ", () => {
    expect(report([]).canSubmit).toBe(false);
  });

  it("chặn gửi duyệt khi chưa đủ 4 cặp để sinh bài tập cốt lõi", () => {
    expect(report([word(1), word(2), word(3)]).canSubmit).toBe(false);
  });
});
