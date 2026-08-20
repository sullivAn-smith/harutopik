// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ExamResultExplanationDialog } from "./exam-result-explanation-dialog";

afterEach(cleanup);

describe("ExamResultExplanationDialog", () => {
  it("chỉ hiện lời giải trong popup sau khi người học yêu cầu", () => {
    render(
      <ExamResultExplanationDialog
        explanation="Phân tích đáp án chi tiết"
        questionNumber={12}
        options={["회사원", "학생", "선생님", "의사"]}
        correctOption={2}
        selectedOption={1}
        showTextOptions
      >
        <p>Đề bài tiếng Hàn</p>
      </ExamResultExplanationDialog>,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Xem giải chi tiết" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Phân tích đáp án chi tiết")).toBeTruthy();
    expect(screen.getByText("Đề bài tiếng Hàn")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Câu 12" })).toBeTruthy();
    const answers = screen.getByRole("list", {
      name: "Các đáp án câu nghe 12",
    });
    expect(answers.children).toHaveLength(4);
    expect(answers.className).toContain("grid-cols-4");
    expect(screen.getByText("회사원")).toBeTruthy();
    expect(screen.getByText("학생")).toBeTruthy();
    expect(screen.getByText("선생님")).toBeTruthy();
    expect(screen.getByText("의사")).toBeTruthy();
    expect(screen.getByText("Đáp án đúng")).toBeTruthy();
    expect(screen.getByText("Bạn đã chọn")).toBeTruthy();
    expect(screen.getByText("Bạn chọn: 1. 회사원")).toBeTruthy();
    expect(screen.getByText("Đáp án: 2. 학생")).toBeTruthy();
    expect(screen.getByRole("dialog").className).toContain("overflow-y-auto");
    expect(screen.getByRole("dialog").className).toContain(
      "[scrollbar-width:none]",
    );

    fireEvent.click(screen.getByRole("button", { name: "Đóng giải chi tiết" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
