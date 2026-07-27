import { describe, expect, it } from "vitest";
import { studySessionStateSchema } from "./study-session-schema";

const validState = {
  schemaVersion: 1,
  mode: "flashcard",
  current: 3,
  flipped: false,
  learnedIndices: [0, 2],
  shuffleSeed: 1,
  quizAnswer: null,
  quizCorrectCount: 0,
  quizWrongIndices: [],
  typedWord: "",
  typingChecked: false,
  typingWrongIndices: [],
  selectedKorean: null,
  matchedIndices: [],
  matchingWrongIndices: [],
  dictationIndex: 0,
  dictationInput: "",
  dictationChecked: false,
  dictationHint: 0,
  dictationWrongIndices: [],
  translationIndex: 0,
  translationDirection: "ko-vi",
  translationInput: "",
  translationChecked: false,
  translationWrongIndices: [],
  updatedAt: "2026-07-25T00:00:00.000Z",
} as const;

describe("studySessionStateSchema", () => {
  it("chấp nhận snapshot phiên học hợp lệ", () => {
    expect(studySessionStateSchema.parse(validState).current).toBe(3);
  });

  it("từ chối index âm và schema version không hỗ trợ", () => {
    expect(
      studySessionStateSchema.safeParse({ ...validState, current: -1 }).success,
    ).toBe(false);
    expect(
      studySessionStateSchema.safeParse({
        ...validState,
        schemaVersion: 2,
      }).success,
    ).toBe(false);
  });
});
