import { describe, expect, it } from "vitest";
import {
  calculateLessonProgress,
  lessonSpeedTestUnlockPercent,
} from "./lesson-progress";

const vocabularyIds = Array.from({ length: 10 }, (_, index) => `word-${index}`);
const practiceModes = ["quiz"] as const;

describe("lesson progress", () => {
  it("mở Speed Test khi đã thuộc toàn bộ từ flashcard", () => {
    const progress = calculateLessonProgress({
      vocabularyIds,
      learnedVocabularyIds: vocabularyIds,
      hasGrammar: true,
      availablePracticeModes: practiceModes,
      practices: [],
    });

    expect(progress.completionPercent).toBe(100);
    expect(progress.eligibleForSpeedTest).toBe(true);
  });

  it("không cộng quiz hoặc ngữ pháp vào phần trăm tiến độ", () => {
    const progress = calculateLessonProgress({
      vocabularyIds,
      learnedVocabularyIds: vocabularyIds.slice(0, 5),
      hasGrammar: true,
      availablePracticeModes: practiceModes,
      practices: [
        { mode: "grammar", score: 5, total: 5 },
        { mode: "quiz", score: 10, total: 10 },
      ],
    });

    expect(progress.completionPercent).toBe(50);
    expect(progress.completionPercent).toBeLessThan(lessonSpeedTestUnlockPercent);
    expect(progress.eligibleForSpeedTest).toBe(false);
  });

  it("không cộng lặp lại một chế độ luyện tập", () => {
    const progress = calculateLessonProgress({
      vocabularyIds,
      learnedVocabularyIds: vocabularyIds.slice(0, 8),
      hasGrammar: true,
      availablePracticeModes: practiceModes,
      practices: [
        { mode: "grammar", score: 3, total: 3 },
        { mode: "quiz", score: 5, total: 10 },
        { mode: "quiz", score: 9, total: 10 },
      ],
    });

    expect(progress.components.practice).toBe(100);
    expect(progress.bestPracticeAccuracy).toBe(90);
    expect(progress.completedModes.filter((mode) => mode === "quiz")).toHaveLength(1);
  });

  it("tự phân bổ lại tỷ trọng khi bài không có ngữ pháp", () => {
    const progress = calculateLessonProgress({
      vocabularyIds,
      learnedVocabularyIds: vocabularyIds,
      hasGrammar: false,
      availablePracticeModes: ["quiz"],
      practices: [{ mode: "quiz", score: 7, total: 10 }],
    });

    expect(progress.completionPercent).toBe(100);
    expect(progress.eligibleForSpeedTest).toBe(true);
  });

  it("gợi ý học flashcard cho số từ còn thiếu", () => {
    const progress = calculateLessonProgress({
      vocabularyIds,
      learnedVocabularyIds: vocabularyIds.slice(0, 5),
      hasGrammar: true,
      availablePracticeModes: practiceModes,
      practices: [],
    });

    expect(progress.recommendedMode).toBe("flashcard");
    expect(progress.recommendation).toContain("5 từ");
  });
});
