import { describe, expect, it } from "vitest";
import { buildExamAttemptPlan } from "./attempt-mode";

const questions = [
  { id: "l1", section: "listening" as const },
  { id: "l2", section: "listening" as const },
  { id: "r1", section: "reading" as const },
];

describe("buildExamAttemptPlan", () => {
  it("chỉ giữ câu nghe và thời gian nghe", () => {
    expect(buildExamAttemptPlan({ mode: "listening", listeningDurationMinutes: 40, readingDurationMinutes: 60, questions })).toMatchObject({
      questions: [questions[0], questions[1]], durationMinutes: 40, initialSection: "listening", maximumScore: 100,
    });
  });

  it("chỉ giữ câu đọc và bắt đầu tại Reading", () => {
    expect(buildExamAttemptPlan({ mode: "reading", listeningDurationMinutes: 40, readingDurationMinutes: 60, questions })).toMatchObject({
      questions: [questions[2]], durationMinutes: 60, initialSection: "reading", maximumScore: 100,
    });
  });

  it("giữ cả hai phần cho bài mô phỏng", () => {
    expect(buildExamAttemptPlan({ mode: "full", listeningDurationMinutes: 40, readingDurationMinutes: 60, questions })).toMatchObject({
      questions, durationMinutes: 100, initialSection: "listening", maximumScore: 200,
    });
  });
});
