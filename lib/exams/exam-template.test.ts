import { describe, expect, it } from "vitest";
import { buildExamSkeleton, examTemplateGroups } from "./exam-template";

describe("fixed exam templates", () => {
  it("tạo đúng form Nghe 30 câu cho TOPIK I", () => {
    const questions = buildExamSkeleton("topik_i");
    const listening = questions.filter((question) => question.section === "listening");
    expect(listening).toHaveLength(30);
    expect(questions.filter((question) => question.section === "reading")).toHaveLength(40);
    expect(listening.filter((question) => question.position <= 14).every((question) => question.audioBlockKey === "")).toBe(true);
    expect(listening.find((question) => question.position === 15)?.audioBlockKey).toBe(listening.find((question) => question.position === 16)?.audioBlockKey);
    expect(listening.filter((question) => question.position >= 15 && question.position <= 16).every((question) => question.answerType === "image")).toBe(true);
    expect(listening.filter((question) => question.position >= 17 && question.position <= 24).every((question) => question.audioBlockKey === "")).toBe(true);
    for (const [first, second] of [[25, 26], [27, 28], [29, 30]]) {
      expect(listening.find((question) => question.position === first)?.audioBlockKey).toBe(listening.find((question) => question.position === second)?.audioBlockKey);
    }
  });

  it("tạo đúng các nhóm phần Đọc câu 31–70 cho TOPIK I", () => {
    const reading = buildExamSkeleton("topik_i").filter((question) => question.section === "reading");
    expect(reading).toHaveLength(40);
    expect(reading.filter((question) => question.position >= 10 && question.position <= 12).every((question) => question.readingType === "practical_info" && question.answerType === "text")).toBe(true);
    expect(reading.filter((question) => question.position >= 13 && question.position <= 18).every((question) => question.passageBlockKey === "")).toBe(true);
    for (const [first, second] of [[19, 20], [21, 22], [23, 24], [25, 26], [27, 28], [29, 30], [31, 32], [33, 34], [35, 36], [37, 38], [39, 40]]) {
      expect(reading.find((question) => question.position === first)?.passageBlockKey).toBe(reading.find((question) => question.position === second)?.passageBlockKey);
    }
    expect(reading.filter((question) => question.position >= 33 && question.position <= 34).every((question) => question.readingType === "practical_info")).toBe(true);
  });

  it("tạo đúng form 50 câu nghe cho TOPIK II", () => {
    const questions = buildExamSkeleton("topik_ii");
    const listening = questions.filter((question) => question.section === "listening");
    expect(listening).toHaveLength(50);
    expect(questions.filter((question) => question.section === "reading")).toHaveLength(50);
    expect(listening.filter((question) => question.position <= 20).every((question) => question.audioBlockKey === "")).toBe(true);
    expect(listening.filter((question) => question.position <= 3).every((question) => question.answerType === "image")).toBe(true);
    expect(listening.filter((question) => question.position >= 4).every((question) => question.answerType === "text")).toBe(true);
    for (let first = 21; first <= 49; first += 2) {
      const firstQuestion = listening.find((question) => question.position === first);
      const secondQuestion = listening.find((question) => question.position === first + 1);
      expect(firstQuestion?.audioBlockKey).not.toBe("");
      expect(firstQuestion?.audioBlockKey).toBe(secondQuestion?.audioBlockKey);
    }
    expect(listening.find((question) => question.position === 22)?.audioBlockKey).not.toBe(listening.find((question) => question.position === 23)?.audioBlockKey);
  });

  it("tạo đúng form 50 câu đọc cho TOPIK II", () => {
    const reading = buildExamSkeleton("topik_ii").filter((question) => question.section === "reading");
    expect(reading).toHaveLength(50);
    expect(reading.filter((question) => question.position >= 5 && question.position <= 10).every((question) => question.readingType === "practical_info")).toBe(true);
    expect(reading.filter((question) => question.position >= 13 && question.position <= 15).every((question) => question.readingType === "sentence_order")).toBe(true);
    expect(reading.filter((question) => question.position >= 28 && question.position <= 31).every((question) => question.readingType === "insert_sentence")).toBe(true);
    expect(reading.filter((question) => question.position >= 39 && question.position <= 41).every((question) => question.readingType === "insert_sentence")).toBe(true);
    for (const [first, second] of [[19, 20], [21, 22], [23, 24], [42, 43], [44, 45], [46, 47]]) {
      expect(reading.find((question) => question.position === first)?.passageBlockKey).toBe(reading.find((question) => question.position === second)?.passageBlockKey);
    }
    const lastGroupKeys = reading.filter((question) => question.position >= 48).map((question) => question.passageBlockKey);
    expect(new Set(lastGroupKeys).size).toBe(1);
    expect(lastGroupKeys[0]).not.toBe("");
  });

  it("không để khoảng trống hoặc trùng vị trí trong template", () => {
    for (const level of ["topik_i", "topik_ii"] as const) {
      for (const section of ["listening", "reading"] as const) {
        const positions = buildExamSkeleton(level).filter((question) => question.section === section).map((question) => question.position);
        expect(new Set(positions).size).toBe(positions.length);
        expect(positions).toEqual(Array.from({ length: positions.length }, (_, index) => index + 1));
      }
    }
    expect(examTemplateGroups.length).toBeGreaterThan(0);
  });
});
