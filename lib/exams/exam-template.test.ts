import { describe, expect, it } from "vitest";
import { buildExamSkeleton, examTemplateGroups } from "./exam-template";

describe("fixed exam templates", () => {
  it("tạo đúng 30 câu nghe và 40 câu đọc cho TOPIK I", () => {
    const questions = buildExamSkeleton("topik_i");
    expect(questions.filter((question) => question.section === "listening")).toHaveLength(30);
    expect(questions.filter((question) => question.section === "reading")).toHaveLength(40);
    expect(questions.filter((question) => question.section === "listening" && question.position <= 6).every((question) => question.answerType === "image")).toBe(true);
    expect(questions.find((question) => question.section === "reading" && question.position === 22)?.readingType).toBe("sentence_order");
  });

  it("tạo đúng 50 câu nghe và 50 câu đọc cho TOPIK II", () => {
    const questions = buildExamSkeleton("topik_ii");
    expect(questions.filter((question) => question.section === "listening")).toHaveLength(50);
    expect(questions.filter((question) => question.section === "reading")).toHaveLength(50);
    expect(questions.find((question) => question.section === "reading" && question.position === 25)?.readingType).toBe("insert_sentence");
    expect(questions.find((question) => question.section === "listening" && question.position === 21)?.audioBlockKey).not.toBe("");
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
