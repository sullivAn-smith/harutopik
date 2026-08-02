import { describe, expect, it } from "vitest";
import { examDraftSchema } from "./types";

const question = {
  position: 1, section: "listening", instruction: "Nghe và chọn.", prompt: "",
  audioUrl: "https://cdn.example.com/q1.mp3", audioText: "안녕하세요", imageUrl: "",
  playLimit: 1, options: ["하나", "둘", "셋", "넷"], correctOption: 1, explanation: "",
};

describe("examDraftSchema", () => {
  it("chấp nhận đề nghe hợp lệ", () => {
    expect(examDraftSchema.safeParse({ code: "topik-i-01", title: "Đề nghe số 1", description: "", durationMinutes: 40, instructions: "", questions: [question] }).success).toBe(true);
  });

  it("cho lưu câu chưa có audio ở bản nháp", () => {
    expect(examDraftSchema.safeParse({ code: "topik-i-01", title: "Đề nghe số 1", description: "", durationMinutes: 40, instructions: "", questions: [{ ...question, audioUrl: "" }] }).success).toBe(true);
  });

  it("từ chối đáp án ngoài 1 đến 4", () => {
    expect(examDraftSchema.safeParse({ code: "topik-i-01", title: "Đề nghe số 1", description: "", durationMinutes: 40, instructions: "", questions: [{ ...question, correctOption: 5 }] }).success).toBe(false);
  });
});
