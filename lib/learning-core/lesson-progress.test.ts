import { describe, expect, it } from "vitest";
import {
  calculateLessonProgress,
  lessonSpeedTestUnlockPercent,
} from "./lesson-progress";

const vocabularyIds = Array.from({ length: 10 }, (_, index) => `word-${index}`);
const practiceModes = [
  "quiz",
  "typing",
  "matching",
  "dictation",
  "translation",
] as const;

describe("lesson progress", () => {
  it("mở Speed Test khi hoàn thành 100% và có bài luyện đạt ít nhất 70%", () => {
    const progress = calculateLessonProgress({
      vocabularyIds,
      learnedVocabularyIds: vocabularyIds,
      hasGrammar: true,
      availablePracticeModes: practiceModes,
      practices: [
        { mode: "grammar", score: 4, total: 5 },
        { mode: "quiz", score: 7, total: 10 },
        { mode: "typing", score: 7, total: 10 },
        { mode: "matching", score: 7, total: 10 },
        { mode: "dictation", score: 7, total: 10 },
        { mode: "translation", score: 7, total: 10 },
      ],
    });

    expect(progress.completionPercent).toBe(100);
    expect(progress.bestPracticeAccuracy).toBe(70);
    expect(progress.eligibleForSpeedTest).toBe(true);
  });

  it("không mở khóa nếu đã làm đủ hoạt động nhưng chưa đạt 70%", () => {
    const progress = calculateLessonProgress({
      vocabularyIds,
      learnedVocabularyIds: vocabularyIds,
      hasGrammar: true,
      availablePracticeModes: practiceModes,
      practices: [
        { mode: "grammar", score: 5, total: 5 },
        { mode: "quiz", score: 6, total: 10 },
        { mode: "typing", score: 6, total: 10 },
        { mode: "matching", score: 6, total: 10 },
        { mode: "dictation", score: 6, total: 10 },
        { mode: "translation", score: 6, total: 10 },
      ],
    });

    expect(progress.completionPercent).toBeLessThan(
      lessonSpeedTestUnlockPercent,
    );
    expect(progress.bestPracticeAccuracy).toBe(60);
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

    expect(progress.components.practice).toBe(20);
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

  it("gợi ý học flashcard trước khi độ phủ từ vựng đạt 80%", () => {
    const progress = calculateLessonProgress({
      vocabularyIds,
      learnedVocabularyIds: vocabularyIds.slice(0, 5),
      hasGrammar: true,
      availablePracticeModes: practiceModes,
      practices: [],
    });

    expect(progress.recommendedMode).toBe("flashcard");
    expect(progress.recommendation).toContain("3 từ");
  });
});
