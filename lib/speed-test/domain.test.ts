import { describe, expect, it } from "vitest";
import {
  calculateSpeedRating,
  adaptivePriorityScore,
  classifySpeedTestAnswer,
  deriveSpeedTestAchievements,
  isCorrectSpeedTestAnswer,
  nextTimeAfterAnswer,
  selectAdaptiveSpeedTestQuestions,
  selectSpeedTestQuestions,
  speedTestRules,
} from "./domain";

const word = {
  id: "apple",
  korean: "사과",
  vietnamese: "quả táo",
  acceptedVietnameseAnswers: ["táo"],
};

describe("speed test domain", () => {
  it("xếp ưu tiên adaptive cao hơn cho từ yếu, chậm và lâu chưa ôn", () => {
    const weak = adaptivePriorityScore({ masteryScore: 35, wrongCount: 4, nearMissCount: 1, averageResponseTimeMs: 2800, lastSeenAt: "2026-07-01T00:00:00Z" }, Date.parse("2026-08-15T00:00:00Z"));
    const strong = adaptivePriorityScore({ masteryScore: 95, wrongCount: 0, nearMissCount: 0, averageResponseTimeMs: 600, lastSeenAt: "2026-08-14T00:00:00Z" }, Date.parse("2026-08-15T00:00:00Z"));
    expect(weak).toBeGreaterThan(strong);
  });
  it("chấm đúng theo cả hai chiều và đáp án thay thế", () => {
    expect(isCorrectSpeedTestAnswer("사 과", word, "vi_ko")).toBe(true);
    expect(isCorrectSpeedTestAnswer("Táo!", word, "ko_vi")).toBe(true);
    expect(isCorrectSpeedTestAnswer("trường học", word, "ko_vi")).toBe(false);
  });

  it("chỉ coi lỗi lệch một ký tự là gần đúng", () => {
    expect(classifySpeedTestAnswer("사가", word, "vi_ko")).toBe("near_miss");
    expect(classifySpeedTestAnswer("학교", word, "vi_ko")).toBe("wrong");
    expect(classifySpeedTestAnswer("사과", word, "vi_ko")).toBe("correct");
  });

  it("chọn số câu không trùng và không vượt quá số từ", () => {
    expect(selectSpeedTestQuestions([1, 2, 3], 10, () => 0.5)).toHaveLength(3);
    expect(new Set(selectSpeedTestQuestions([1, 2, 3], "all", () => 0.2)).size).toBe(3);
  });

  it("trộn từ yếu và từng sai vào phiên adaptive mà không lặp", () => {
    const items = Array.from({ length: 20 }, (_, index) => ({ id: String(index + 1) }));
    const selected = selectAdaptiveSpeedTestQuestions(items, 10, {
      "1": { masteryScore: 20, wrongCount: 3, nearMissCount: 0, lastWrongAt: "2026-08-13T00:00:00Z" },
      "2": { masteryScore: 30, wrongCount: 0, nearMissCount: 2, lastWrongAt: "2026-08-12T00:00:00Z" },
      "3": { masteryScore: 40, wrongCount: 0, nearMissCount: 0 },
    }, () => 0.5);
    expect(selected).toHaveLength(10);
    expect(new Set(selected.map((item) => item.id)).size).toBe(10);
    expect(selected.some((item) => item.id === "1")).toBe(true);
    expect(selected.some((item) => item.id === "2")).toBe(true);
    expect(selected.some((item) => item.id === "3")).toBe(true);
    expect(["1", "2", "3"]).not.toContain(selected[0].id);
  });

  it("chế độ toàn bộ giữ đủ từ và vẫn xen kẽ từ ưu tiên", () => {
    const items = Array.from({ length: 6 }, (_, index) => ({ id: String(index + 1) }));
    const selected = selectAdaptiveSpeedTestQuestions(items, "all", {
      "1": { masteryScore: 15, wrongCount: 2, nearMissCount: 0 },
      "2": { masteryScore: 25, wrongCount: 1, nearMissCount: 0 },
    }, () => 0.5);
    expect(selected).toHaveLength(6);
    expect(new Set(selected.map((item) => item.id)).size).toBe(6);
    expect(["1", "2"]).not.toContain(selected[0].id);
  });

  it("áp dụng bonus combo và giới hạn thời gian", () => {
    expect(nextTimeAfterAnswer({ currentSeconds: 60, correct: true, nextCombo: 5 })).toBe(63);
    expect(nextTimeAfterAnswer({ currentSeconds: 120, correct: true, nextCombo: 1 })).toBe(speedTestRules.maximumSeconds);
    expect(nextTimeAfterAnswer({ currentSeconds: 1, correct: false, nextCombo: 0 })).toBe(0);
  });

  it("ưu tiên độ chính xác khi xếp hạng", () => {
    expect(calculateSpeedRating({ accuracy: 100, completed: true })).toBe("S+");
    expect(calculateSpeedRating({ accuracy: 90, completed: false })).toBe("A");
  });

  it("mở thành tích từ lịch sử thực tế", () => {
    const achievements = deriveSpeedTestAchievements([
      { accuracy: 100, bestCombo: 30, remainingSeconds: 64, totalQuestions: 30, completed: true },
      { accuracy: 95, bestCombo: 12, remainingSeconds: 45, totalQuestions: 30, completed: true },
      { accuracy: 90, bestCombo: 10, remainingSeconds: 38, totalQuestions: 20, completed: true },
    ]);
    expect(achievements).toMatchObject({
      firstRun: true,
      perfect: true,
      comboMaster: true,
      speedDemon: true,
      consistent: true,
      veteran: false,
    });
  });
});
