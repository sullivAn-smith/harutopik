import { describe, expect, it } from "vitest";
import { canReviewExamAnswers } from "./answer-review-policy";

describe("canReviewExamAnswers", () => {
  const now = new Date("2026-08-05T12:00:00.000Z");

  it("mở đáp án ngay với chính sách immediate", () => {
    expect(canReviewExamAnswers("immediate", null, now)).toBe(true);
  });

  it("giữ kín đáp án với score_only và never", () => {
    expect(canReviewExamAnswers("score_only", null, now)).toBe(false);
    expect(canReviewExamAnswers("never", null, now)).toBe(false);
  });

  it("chỉ mở đáp án sau thời điểm công bố", () => {
    expect(canReviewExamAnswers("after_date", "2026-08-05T11:59:00.000Z", now)).toBe(true);
    expect(canReviewExamAnswers("after_date", "2026-08-05T12:01:00.000Z", now)).toBe(false);
  });
});
