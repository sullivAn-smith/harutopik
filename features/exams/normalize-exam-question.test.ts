import { describe, expect, it } from "vitest";
import { normalizeExamQuestion } from "./normalize-exam-question";

describe("normalizeExamQuestion", () => {
  it("giữ nguyên phần Đọc khi tải lại câu hỏi đã lưu", () => {
    const question = normalizeExamQuestion({
      id: "5ddfd0cc-475c-41c3-bac8-129cbf36c499",
      position: 3,
      section: "reading",
      instruction: "Đọc và chọn đáp án đúng.",
      prompt: "빈칸에 알맞은 것을 고르십시오.",
      audio_url: null,
      audio_text: "알맞은",
      image_url: null,
      play_limit: 1,
      options: ["하나", "둘", "셋", "넷"],
      correct_option: 2,
      explanation: "",
    });

    expect(question.section).toBe("reading");
    expect(question.underlinedText).toBe("알맞은");
  });
});
