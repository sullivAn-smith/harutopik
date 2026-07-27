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

  it("vẫn bật chính tả bằng giọng thiết bị khi chưa có audio CDN", () => {
    const withoutAudio = report([word(1)]);
    const withAudio = report([
      word(1, { audioUrl: "https://cdn.example/word.mp3" }),
    ]);
    expect(withoutAudio.availableModes).toContain("dictation");
    expect(
      withoutAudio.modes.find((mode) => mode.mode === "dictation")?.missing,
    ).toEqual([expect.stringContaining("giọng đọc dự phòng")]);
    expect(withAudio.availableModes).toContain("dictation");
  });

  it("chấp nhận bài chính tả được biên soạn dù từ chưa có audio", () => {
    const result = report([word(1)], [
      {
        id: "dictation-1",
        type: "dictation",
        sentence: "안녕하세요",
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
