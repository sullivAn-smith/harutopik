import { describe, expect, it } from "vitest";
import {
  normalizeAnswer,
  normalizeKorean,
  toRuntimeVocabulary,
} from "./domain";

describe("vocabulary domain", () => {
  it("chuẩn hóa khoảng trắng và Unicode tiếng Hàn", () => {
    expect(normalizeKorean("  안녕   하세요  ")).toBe("안녕 하세요");
  });

  it("chuẩn hóa đáp án tiếng Việt để chấm linh hoạt", () => {
    expect(normalizeAnswer("  Xin CHÀO! ")).toBe("xin chào");
  });

  it("chuyển vocabulary master sang contract runtime hiện tại", () => {
    const item = toRuntimeVocabulary({
      master: {
        id: "greeting-001",
        hangul: "안녕하세요",
        normalizedHangul: "안녕하세요",
        romanization: "annyeonghaseyo",
        primaryMeaningVi: "Xin chào",
        partOfSpeech: "Biểu hiện",
        level: "beginner",
        category: "Chào hỏi",
        audioUrl: "https://cdn.example/audio.mp3",
        imageUrl: null,
        status: "published",
      },
      examples: [],
    });
    expect(item.korean).toBe("안녕하세요");
    expect(item.audioUrl).toContain("audio.mp3");
  });
});
