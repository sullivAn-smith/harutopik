import { describe, expect, it } from "vitest";
import { buildFlashRecallQuestions, checkFlashRecall, flashRecallRules, gradeFlashRecall } from "./flash-recall-domain";
const vocabulary = Array.from({ length: 30 }, (_, i) => ({ id: `w${i}`, korean: `단어${i}`, vietnamese: `nghĩa ${i}`, romanization: "", category: "general" as const, partOfSpeech: "noun" as const, examples: [] }));
describe("flash recall domain", () => {
  it("tạo đúng số câu và mixed hai chiều", () => { const items = buildFlashRecallQuestions({ vocabulary, level: "hard", direction: "mixed", random: () => .4 }); expect(items).toHaveLength(30); expect(new Set(items.map((x) => x.direction)).size).toBe(2); });
  it("chấm normalize và tốc độ", () => { const [q] = buildFlashRecallQuestions({ vocabulary, level: "easy", direction: "ko_vi" }); expect(checkFlashRecall(` ${q.expected} `, q)).toBe(true); expect(gradeFlashRecall("medium", true, 700)).toBe("perfect"); expect(flashRecallRules.levels.hard.showMs).toBe(600); });
});
