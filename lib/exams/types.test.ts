import { describe, expect, it } from "vitest";
import { examDraftSchema, getExamEligibility, type ExamQuestionInput } from "./types";

const question = {
  position: 1, section: "listening", instruction: "Nghe và chọn.", prompt: "",
  audioUrl: "https://cdn.example.com/q1.mp3", audioText: "안녕하세요", imageUrl: "",
  playLimit: 1, options: ["하나", "둘", "셋", "넷"], correctOption: 1, explanation: "",
} satisfies ExamQuestionInput;

describe("examDraftSchema", () => {
  const draft = {
    code: "topik-i-01", title: "Đề TOPIK I số 1", description: "",
    listeningDurationMinutes: 40, readingDurationMinutes: 60,
    instructions: "", questions: [
      question,
      { ...question, position: 1, section: "reading", audioUrl: "", audioText: "", prompt: "빈칸에 알맞은 것을 고르십시오." },
    ],
  };

  it("chấp nhận đề TOPIK I có phần nghe và đọc", () => {
    expect(examDraftSchema.safeParse(draft).success).toBe(true);
  });

  it("cho lưu câu chưa có audio ở bản nháp", () => {
    expect(examDraftSchema.safeParse({ ...draft, questions: [{ ...question, audioUrl: "" }] }).success).toBe(true);
  });

  it("từ chối đáp án ngoài 1 đến 4", () => {
    expect(examDraftSchema.safeParse({ ...draft, questions: [{ ...question, correctOption: 5 }] }).success).toBe(false);
  });

  it("từ chối section không thuộc TOPIK I", () => {
    expect(examDraftSchema.safeParse({ ...draft, questions: [{ ...question, section: "writing" }] }).success).toBe(false);
  });
});

describe("getExamEligibility", () => {
  it("yêu cầu cả phần nghe và đọc trước khi gửi duyệt", () => {
    expect(getExamEligibility([question])).toEqual(expect.objectContaining({ eligible: false, readingCount: 0 }));
  });

  it("yêu cầu audio cho câu nghe nhưng không yêu cầu audio cho câu đọc", () => {
    const reading = { ...question, section: "reading" as const, audioUrl: "", audioText: "" };
    expect(getExamEligibility([{ ...question, audioUrl: "" }, reading]).issues).toContain("Câu nghe 1 đang thiếu audio.");
    expect(getExamEligibility([question, reading]).eligible).toBe(true);
  });
});
