import { describe, expect, it } from "vitest";
import { boxesTopikIIReadingPrimaryPrompt, boxesTopikIIReadingSecondaryPrompt, getTopikIITextAnswerLayout, showsTopikIIReadingImageAbove, showsTopikIIReadingTitleAbove, usesCompactTopikIIReadingImageFrame } from "./exam-question-layout";

describe("TOPIK II question layout", () => {
  it("uses vertical listening answers except the requested questions", () => {
    expect(getTopikIITextAnswerLayout("topik_ii", "listening", 1)).toBe("vertical");
    for (const position of [6, 7, 9, 11, 12, 29]) {
      expect(getTopikIITextAnswerLayout("topik_ii", "listening", position)).toBe("two_columns");
    }
  });

  it("uses the requested reading answer layouts", () => {
    for (const position of [5, 8, 18, 19, 39, 40, 41, 46]) {
      expect(getTopikIITextAnswerLayout("topik_ii", "reading", position)).toBe("horizontal");
    }
    for (const position of [9, 10, 11, 12, 20, 22, 24, 25, 26, 27, 38, 43, 44, 45, 47, 48, 49, 50]) {
      expect(getTopikIITextAnswerLayout("topik_ii", "reading", position)).toBe("vertical");
    }
  });

  it("places reading images above answers only for questions 5 through 10", () => {
    expect(showsTopikIIReadingImageAbove("topik_ii", "reading", 5)).toBe(true);
    expect(showsTopikIIReadingImageAbove("topik_ii", "reading", 10)).toBe(true);
    expect(showsTopikIIReadingImageAbove("topik_ii", "reading", 11)).toBe(false);
    expect(showsTopikIIReadingImageAbove("topik_i", "reading", 5)).toBe(false);
  });

  it("uses the shorter image frame only for reading questions 5 through 8", () => {
    expect(usesCompactTopikIIReadingImageFrame("topik_ii", "reading", 5)).toBe(true);
    expect(usesCompactTopikIIReadingImageFrame("topik_ii", "reading", 8)).toBe(true);
    expect(usesCompactTopikIIReadingImageFrame("topik_ii", "reading", 9)).toBe(false);
  });

  it("places the requested reading titles above the material", () => {
    for (const position of [5, 8, 9, 12, 13, 18, 28, 38]) {
      expect(showsTopikIIReadingTitleAbove("topik_ii", "reading", position)).toBe(true);
    }
    expect(showsTopikIIReadingTitleAbove("topik_ii", "reading", 19)).toBe(false);
  });

  it("boxes TOPIK II reading prompts and 보기 at the requested positions", () => {
    for (const position of [39, 40, 41]) {
      expect(boxesTopikIIReadingPrimaryPrompt("topik_ii", "reading", position)).toBe(true);
      expect(boxesTopikIIReadingSecondaryPrompt("topik_ii", "reading", position)).toBe(true);
    }
    expect(boxesTopikIIReadingSecondaryPrompt("topik_ii", "reading", 46)).toBe(true);
    expect(boxesTopikIIReadingPrimaryPrompt("topik_ii", "reading", 46)).toBe(false);
  });
});
