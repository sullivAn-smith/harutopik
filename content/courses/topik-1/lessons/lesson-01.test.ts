import { describe, expect, it } from "vitest";
import { lessonOne } from "./lesson-01";

describe("lessonOne content", () => {
  it("có cấu trúc và số lượng nội dung mong đợi", () => {
    expect(lessonOne.id).toBe("lesson-topik-1-01");
    expect(lessonOne.version).toBe(1);
    expect(lessonOne.vocabulary).toHaveLength(55);
    expect(lessonOne.grammar).toHaveLength(3);
    expect(
      lessonOne.exercises.filter((exercise) => exercise.type === "fill-blank"),
    ).toHaveLength(10);
    expect(
      lessonOne.exercises.filter((exercise) => exercise.type === "dictation"),
    ).toHaveLength(15);
    expect(
      lessonOne.exercises.filter((exercise) => exercise.type === "translation"),
    ).toHaveLength(15);
  });

  it("mọi nội dung đều có ID duy nhất", () => {
    const ids = [
      ...lessonOne.vocabulary.map((item) => item.id),
      ...lessonOne.grammar.map((item) => item.id),
      ...lessonOne.exercises.map((item) => item.id),
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("mỗi từ có phiên âm, hình ảnh và ví dụ", () => {
    for (const item of lessonOne.vocabulary) {
      expect(item.romanization.length).toBeGreaterThan(0);
      expect(item.imageUrl?.length).toBeGreaterThan(0);
      expect(item.examples.length).toBeGreaterThan(0);
    }
  });
});
