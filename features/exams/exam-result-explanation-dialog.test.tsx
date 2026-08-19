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

    fireEvent.click(screen.getByRole("button", { name: "Đóng giải chi tiết" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
