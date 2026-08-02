// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ExamPreflight } from "./exam-preflight";

vi.mock("./actions", () => ({ startExam: vi.fn() }));

describe("ExamPreflight", () => {
  it("hiển thị quy định TOPIK I và khóa nút trước khi đồng ý", () => {
    render(<ExamPreflight examId="00000000-0000-4000-8000-000000000000" listeningMinutes={40} readingMinutes={60} />);
    expect(screen.getByText(/Audio mỗi câu chỉ phát một lần/)).toBeTruthy();
    expect((screen.getByRole("button", { name: /Bắt đầu phần Nghe/ }) as HTMLButtonElement).disabled).toBe(true);
  });
});
