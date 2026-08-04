// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExamPreflight } from "./exam-preflight";

vi.mock("./actions", () => ({ startExam: vi.fn() }));

afterEach(cleanup);

describe("ExamPreflight", () => {
  it("hiển thị quy định TOPIK I và khóa nút trước khi đồng ý", () => {
    render(<ExamPreflight examId="00000000-0000-4000-8000-000000000000" listeningMinutes={40} readingMinutes={60} />);
    expect(screen.getByText(/Audio mỗi câu chỉ phát một lần/)).toBeTruthy();
    expect((screen.getByRole("button", { name: /Bắt đầu thi mô phỏng/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("cho bắt đầu chế độ chỉ Đọc mà không bắt buộc kiểm tra loa", () => {
    render(<ExamPreflight examId="00000000-0000-4000-8000-000000000000" listeningMinutes={40} readingMinutes={60} />);
    fireEvent.click(screen.getByRole("button", { name: /Chỉ thi Đọc/ }));
    fireEvent.click(screen.getByRole("checkbox"));

    expect(screen.queryByRole("button", { name: "Kiểm tra loa" })).toBeNull();
    expect((screen.getByRole("button", { name: /Bắt đầu phần Đọc/ }) as HTMLButtonElement).disabled).toBe(false);
  });
});
