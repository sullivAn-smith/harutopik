import { describe, expect, it } from "vitest";
import {
  buildCustomVocabularySnapshot,
  createCustomVocabularyItemSchema,
  customVocabularyLimit,
  isCustomVocabularyItem,
} from "./schema";

describe("custom vocabulary schema", () => {
  it("chỉ bắt buộc tiếng Hàn và nghĩa tiếng Việt", () => {
    const parsed = createCustomVocabularyItemSchema.parse({
      korean: "약속",
      vietnamese: "lời hứa",
    });
    const snapshot = buildCustomVocabularySnapshot("custom-word-1", parsed);

    expect(snapshot).toMatchObject({
      id: "custom-word-1",
      korean: "약속",
      vietnamese: "lời hứa",
      romanization: "—",
      category: "Từ cá nhân",
      examples: [],
    });
  });

  it("từ chối khi thiếu một trong hai trường bắt buộc", () => {
    expect(
      createCustomVocabularyItemSchema.safeParse({
        korean: "",
        vietnamese: "lời hứa",
      }).success,
    ).toBe(false);
    expect(
      createCustomVocabularyItemSchema.safeParse({
        korean: "약속",
        vietnamese: "",
      }).success,
    ).toBe(false);
  });

  it("nhận diện từ custom và giữ giới hạn 50 từ", () => {
    expect(customVocabularyLimit).toBe(50);
    expect(
      isCustomVocabularyItem({
        vocabularyId: "custom-123",
        lessonId: "custom",
      }),
    ).toBe(true);
    expect(
      isCustomVocabularyItem({
        vocabularyId: "vocabulary-123",
        lessonId: "lesson-1",
      }),
    ).toBe(false);
  });
});
