import { describe, expect, it } from "vitest";
import { canAccessQuestion, mergeAttemptAnswer, scoreAttemptSnapshot } from "./attempt-state";

const questions = [
  { id: "l1", section: "listening", correct_option: 1 },
  { id: "l2", section: "listening", correct_option: 2 },
  { id: "r1", section: "reading", correct_option: 3 },
  { id: "r2", section: "reading", correct_option: 4 },
] as const;

describe("canAccessQuestion", () => {
  it("cho mở mọi câu trong cả phần nghe và phần đọc", () => {
    expect(canAccessQuestion({ section: "listening", currentPosition: 2, questionSection: "listening", questionPosition: 1 })).toBe(true);
    expect(canAccessQuestion({ section: "listening", currentPosition: 2, questionSection: "listening", questionPosition: 2 })).toBe(true);
    expect(canAccessQuestion({ section: "reading", currentPosition: 2, questionSection: "reading", questionPosition: 1 })).toBe(true);
    expect(canAccessQuestion({ section: "listening", currentPosition: 2, questionSection: "reading", questionPosition: 1 })).toBe(true);
  });
});

describe("scoreAttemptSnapshot", () => {
  it("tính riêng điểm nghe, đọc và tổng điểm", () => {
    expect(scoreAttemptSnapshot(questions, { l1: 1, l2: 4, r1: 3, r2: 4 })).toEqual({
      listeningCorrect: 1,
      listeningTotal: 2,
      listeningScore: 50,
      readingCorrect: 2,
      readingTotal: 2,
      readingScore: 100,
      correctCount: 3,
      totalQuestions: 4,
      totalScore: 150,
    });
  });
});

describe("mergeAttemptAnswer", () => {
  it("giữ nguyên answers khi chỉ cập nhật cờ xem lại", () => {
    expect(mergeAttemptAnswer({ r1: 3 }, "r2", null)).toEqual({ r1: 3 });
  });
});
