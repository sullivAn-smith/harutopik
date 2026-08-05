import { describe, expect, it } from "vitest";
import { planPublishedLessonVocabularyRemoval } from "./published-lesson-vocabulary";

const vocabulary = [
  { id: "word-1", korean: "학교" },
  { id: "word-2", korean: "학생" },
  { id: "word-3", korean: "선생님" },
];

describe("planPublishedLessonVocabularyRemoval", () => {
  it("chỉ gỡ các từ đã chọn khỏi bài và loại ID trùng lặp", () => {
    const result = planPublishedLessonVocabularyRemoval(vocabulary, [
      "word-1",
      "word-3",
      "word-1",
    ]);

    expect(result).toEqual({
      retainedVocabulary: [{ id: "word-2", korean: "학생" }],
      removedVocabularyIds: ["word-1", "word-3"],
      invalidVocabularyIds: [],
    });
    expect(vocabulary).toHaveLength(3);
  });

  it("phát hiện ID cũ không còn thuộc bài để tránh cập nhật nhầm", () => {
    const result = planPublishedLessonVocabularyRemoval(vocabulary, [
      "word-2",
      "word-stale",
    ]);

    expect(result.invalidVocabularyIds).toEqual(["word-stale"]);
    expect(result.retainedVocabulary).toEqual(vocabulary);
  });

  it("cho phép gỡ toàn bộ từ khỏi bài nhưng không thay đổi dữ liệu đầu vào", () => {
    const result = planPublishedLessonVocabularyRemoval(vocabulary, [
      "word-1",
      "word-2",
      "word-3",
    ]);

    expect(result.retainedVocabulary).toEqual([]);
    expect(result.removedVocabularyIds).toEqual([
      "word-1",
      "word-2",
      "word-3",
    ]);
    expect(vocabulary).toHaveLength(3);
  });
});
