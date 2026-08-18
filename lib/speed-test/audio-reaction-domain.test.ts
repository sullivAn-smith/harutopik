import { describe, expect, it } from "vitest";

import type { VocabularyItem } from "@/content/schema";
import {
  buildAudioReactionQuestions,
  buildFlashReactionQuestions,
  createAudioReactionPool,
  createFlashReactionPool,
  gradeAudioReaction,
  isCorrectAudioReactionAnswer,
  scoreAudioReactionAnswer,
  streakMultiplier,
} from "./audio-reaction-domain";

function word(index: number, withWordAudio = true, withExampleAudio = true): VocabularyItem {
  return {
    id: `word-${index}`,
    korean: `단어${index}`,
    vietnamese: `nghĩa ${index}`,
    romanization: `word-${index}`,
    category: index % 2 ? "place" : "person",
    partOfSpeech: "noun",
    ...(withWordAudio ? { audioUrl: `/word-${index}.mp3` } : {}),
    examples: [{
      id: `example-${index}`,
      korean: `예문 ${index}`,
      vietnamese: `câu ví dụ ${index}`,
      ...(withExampleAudio ? { audioUrl: `/example-${index}.mp3` } : {}),
    }],
  };
}

describe("Audio Reaction domain", () => {
  it("chỉ tạo câu từ audio của từ đơn và bỏ qua audio câu ví dụ", () => {
    const pool = createAudioReactionPool([word(1), word(2, false, true), word(3, true, false)]);
    expect(pool.map((question) => question.id)).toEqual([
      "word:word-1",
      "word:word-3",
    ]);
    expect(pool.every((question) => question.type === "word")).toBe(true);
  });

  it("tạo toàn bộ câu hỏi từ audio từ đơn của lesson hiện tại", () => {
    const vocabulary = Array.from({ length: 10 }, (_, index) => word(index + 1));
    const questions = buildAudioReactionQuestions({ vocabulary, questionCount: 10, random: () => 0.42 });
    expect(questions).toHaveLength(10);
    expect(questions.every((question) => question.type === "word")).toBe(true);
    expect(questions.every((question) => vocabulary.some((item) => item.id === question.vocabularyId))).toBe(true);
  });

  it("không dùng audio câu ví dụ để bù khi thiếu audio từ đơn", () => {
    const vocabulary = Array.from({ length: 10 }, (_, index) =>
      word(index + 1, index < 8, true)
    );
    const questions = buildAudioReactionQuestions({ vocabulary, questionCount: 10, random: () => 0.3 });
    expect(questions).toHaveLength(8);
    expect(questions.every((question) => question.id.startsWith("word:"))).toBe(true);
  });

  it("chấm grade, multiplier và score ổn định", () => {
    const question = createAudioReactionPool([word(1)])[0];
    expect(gradeAudioReaction("choose", true, 700)).toBe("perfect");
    expect(gradeAudioReaction("choose", true, 1_301)).toBe("good");
    expect(gradeAudioReaction("type", false, 100)).toBe("miss");
    expect(streakMultiplier(7)).toBe(1.5);
    expect(scoreAudioReactionAnswer(question, "perfect", 7)).toBe(270);
  });

  it("chỉ chấp nhận đáp án chính xác sau normalize", () => {
    const question = createAudioReactionPool([word(1)])[0];
    expect(isCorrectAudioReactionAnswer("  NGHĨA 1 ", question)).toBe(true);
    expect(isCorrectAudioReactionAnswer("nghĩa 2", question)).toBe(false);
  });

  it("tạo Flash Reaction hai chiều mà không phụ thuộc audio", () => {
    const vocabulary = [word(1, false, false), word(2, false, false)];
    const koreanFirst = createFlashReactionPool(vocabulary, "ko_vi")[0];
    const vietnameseFirst = createFlashReactionPool(vocabulary, "vi_ko")[0];
    expect(koreanFirst.korean).toBe("단어1");
    expect(koreanFirst.correctAnswer).toBe("nghĩa 1");
    expect(vietnameseFirst.korean).toBe("nghĩa 1");
    expect(vietnameseFirst.correctAnswer).toBe("단어1");
    expect(buildFlashReactionQuestions({ vocabulary, direction: "ko_vi", questionCount: 10 })).toHaveLength(2);
  });
});
