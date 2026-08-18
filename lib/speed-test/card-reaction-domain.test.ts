import { describe, expect, it } from "vitest";

import type { VocabularyItem } from "@/content/schema";
import { cardReactionRules, createCardReactionBoard, gradeCardAnswer, isCorrectCardAnswer, relocateWrongCard, scoreCardAnswer } from "./card-reaction-domain";

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

  it("đổi vị trí thẻ trả lời sai với một thẻ chưa clear khác", () => {
    const cards = [{ id: "wrong" }, { id: "next" }, { id: "other" }];
    const relocated = relocateWrongCard({
      cards,
      wrongCardId: "wrong",
      clearedCardIds: new Set<string>(),
      random: () => 0,
    });
    expect(relocated.map((card) => card.id)).toEqual([
      "next",
      "wrong",
      "other",
    ]);
  });

  it("giữ nguyên vị trí nếu thẻ sai là thẻ cuối cùng chưa clear", () => {
    const cards = [{ id: "done-1" }, { id: "last" }, { id: "done-2" }];
    const relocated = relocateWrongCard({
      cards,
      wrongCardId: "last",
      clearedCardIds: new Set(["done-1", "done-2"]),
      random: () => 0.7,
    });
    expect(relocated).toEqual(cards);
  });
});
