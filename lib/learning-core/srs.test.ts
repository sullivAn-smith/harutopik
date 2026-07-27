import { describe, expect, it } from "vitest";
import { newReviewCard, scheduleReview } from "./srs";

const now = new Date("2026-07-24T00:00:00.000Z");

describe("scheduleReview", () => {
  it("lên lịch học lại sau 10 phút khi quên", () => {
    const result = scheduleReview(newReviewCard, "again", now);
    expect(result.state).toBe("learning");
    expect(result.lapses).toBe(1);
    expect(result.dueAt).toBe("2026-07-24T00:10:00.000Z");
  });

  it("cho từ mới đã nhớ ôn lại vào ngày hôm sau", () => {
    const result = scheduleReview(newReviewCard, "good", now);
    expect(result.state).toBe("review");
    expect(result.intervalDays).toBe(1);
    expect(result.dueAt).toBe("2026-07-25T00:00:00.000Z");
  });

  it("tăng khoảng ôn khi nhớ dễ dàng", () => {
    const card = {
      ...newReviewCard,
      state: "review" as const,
      stabilityDays: 10,
      reps: 3,
    };
    const good = scheduleReview(card, "good", now);
    const easy = scheduleReview(card, "easy", now);
    expect(easy.intervalDays).toBeGreaterThan(good.intervalDays);
    expect(easy.difficulty).toBeLessThan(good.difficulty);
  });
});
