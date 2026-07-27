import { describe, expect, it } from "vitest";
import {
  createQuizIndices,
  isPracticeComplete,
  modeMistakes,
  type PracticeCompletionInput,
} from "./session";

const baseCompletionInput: PracticeCompletionInput = {
  mode: "quiz",
  currentVocabularyIndex: 0,
  vocabularyTotal: 55,
  answered: false,
  matchingGroupStart: 0,
  matchingGroupSize: 4,
  matchedInCurrentGroup: 0,
  dictationIndex: 0,
  dictationTotal: 15,
  dictationChecked: false,
  translationIndex: 0,
  translationTotal: 15,
  translationChecked: false,
};

describe("isPracticeComplete", () => {
  it("chỉ hoàn thành quiz sau khi trả lời từ cuối", () => {
    expect(
      isPracticeComplete({
        ...baseCompletionInput,
        currentVocabularyIndex: 54,
        answered: true,
      }),
    ).toBe(true);
    expect(
      isPracticeComplete({
        ...baseCompletionInput,
        currentVocabularyIndex: 53,
        answered: true,
      }),
    ).toBe(false);
  });

  it("hoàn thành matching ở nhóm cuối kể cả nhóm có ít hơn 4 từ", () => {
    expect(
      isPracticeComplete({
        ...baseCompletionInput,
        mode: "matching",
        matchingGroupStart: 52,
        matchingGroupSize: 3,
        matchedInCurrentGroup: 3,
      }),
    ).toBe(true);
  });

  it("không coi flashcard là một bài kiểm tra hoàn thành", () => {
    expect(
      isPracticeComplete({
        ...baseCompletionInput,
        mode: "flashcard",
      }),
    ).toBe(false);
  });
});

describe("createQuizIndices", () => {
  it("tạo các lựa chọn không trùng cho bộ từ lớn", () => {
    const indices = createQuizIndices(3, 55);
    expect(indices).toHaveLength(4);
    expect(new Set(indices).size).toBe(4);
    expect(indices).toContain(3);
  });

  it("không tạo nhiều lựa chọn hơn tổng số từ", () => {
    expect(createQuizIndices(0, 2)).toEqual([0, 1]);
  });
});

describe("modeMistakes", () => {
  it("trả đúng danh sách lỗi theo chế độ", () => {
    expect(
      modeMistakes("dictation", {
        quiz: [1],
        typing: [2],
        matching: [3],
        dictation: [4],
        translation: [5],
      }),
    ).toEqual([4]);
  });
});
