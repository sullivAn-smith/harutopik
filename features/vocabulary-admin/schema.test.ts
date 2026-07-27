import { describe, expect, it } from "vitest";
import {
  parseAnswerLines,
  parseExamplesJson,
  vocabularyFormSchema,
} from "./schema";

describe("vocabulary CMS schema", () => {
  it("loại đáp án rỗng và trùng", () => {
    expect(parseAnswerLines("Xin chào\n\nChào bạn\nXin chào")).toEqual([
      "Xin chào",
      "Chào bạn",
    ]);
  });

  it("đọc câu ví dụ có cấu trúc", () => {
    expect(
      parseExamplesJson(
        JSON.stringify([{ korean: "안녕하세요.", vietnamese: "Xin chào." }]),
      ),
    ).toHaveLength(1);
  });

  it("từ chối câu ví dụ còn thiếu nghĩa", () => {
    expect(() =>
      parseExamplesJson(
        JSON.stringify([{ korean: "안녕하세요.", vietnamese: "" }]),
      ),
    ).toThrow();
  });

  it("kiểm tra URL audio", () => {
    const result = vocabularyFormSchema.safeParse({
      hangul: "안녕하세요",
      romanization: "annyeonghaseyo",
      primaryMeaningVi: "Xin chào",
      partOfSpeech: "Biểu hiện",
      level: "beginner",
      category: "Chào hỏi",
      audioUrl: "không-phải-url",
      imageUrl: "",
      acceptedVi: "",
      acceptedKo: "",
      examplesJson: "[]",
    });
    expect(result.success).toBe(false);
  });
});
