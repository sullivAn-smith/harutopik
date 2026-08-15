import { describe, expect, it } from "vitest";

import type { VocabularyItem } from "@/content/schema";
import { cardReactionRules, createCardReactionBoard, gradeCardAnswer, isCorrectCardAnswer, scoreCardAnswer } from "./card-reaction-domain";

const vocabulary = Array.from({ length: 30 }, (_, index): VocabularyItem => ({
  id: `word-${index + 1}`, korean: `단어${index + 1}`, vietnamese: `nghĩa ${index + 1}`,
  romanization: `word-${index + 1}`, category: "general", partOfSpeech: "noun", examples: [],
}));

describe("Card Reaction domain", () => {
  it("tạo đúng board 3×3, 4×4 và 5×5 không trùng từ", () => {
    for (const level of ["easy", "medium", "hard"] as const) {
      const board = createCardReactionBoard({ vocabulary, level, direction: "mixed", random: () => 0.42 });
      expect(board).toHaveLength(cardReactionRules.levels[level].cards);
      expect(new Set(board.map((card) => card.vocabularyId)).size).toBe(board.length);
    }
  });

  it("Mixed xen kẽ hai chiều và tạo đúng số đáp án theo level", () => {
    const board = createCardReactionBoard({ vocabulary, level: "hard", direction: "mixed", random: () => 0.3 });
    expect(new Set(board.map((card) => card.direction))).toEqual(new Set(["ko_vi", "vi_ko"]));
    expect(board.every((card) => card.options.length === 5)).toBe(true);
  });

  it("chấm normalize, grade, difficulty và revenge bonus", () => {
    const card = createCardReactionBoard({ vocabulary, level: "easy", direction: "ko_vi" })[0];
    expect(isCorrectCardAnswer(`  ${card.correctAnswer.toUpperCase()} `, card)).toBe(true);
    expect(gradeCardAnswer("choose", true, 700)).toBe("perfect");
    expect(scoreCardAnswer("hard", "perfect", 1, true)).toBeGreaterThan(scoreCardAnswer("easy", "perfect", 1, false));
  });
});
