// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExamPreflight } from "./exam-preflight";

vi.mock("./actions", () => ({ startExam: vi.fn() }));

afterEach(cleanup);

describe("ExamPreflight", () => {
  it("hiển thị quy định TOPIK I và khóa nút trước khi đồng ý", () => {
    render(<ExamPreflight examId="00000000-0000-4000-8000-000000000000" listeningMinutes={40} readingMinutes={60} />);
    expect(screen.getByText(/phát, tạm dừng, tua và nghe lại audio/)).toBeTruthy();
    expect((screen.getByRole("button", { name: /Bắt đầu thi mô phỏng/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("cho bắt đầu chế độ chỉ Đọc mà không bắt buộc kiểm tra loa", () => {
    render(<ExamPreflight examId="00000000-0000-4000-8000-000000000000" listeningMinutes={40} readingMinutes={60} />);
    fireEvent.click(screen.getByRole("button", { name: /Chỉ thi Đọc/ }));
    fireEvent.click(screen.getByRole("checkbox"));

    expect(screen.queryByRole("button", { name: "Kiểm tra loa" })).toBeNull();
    expect((screen.getByRole("button", { name: /Bắt đầu phần Đọc/ }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("hiển thị tiến trình và đường dẫn tiếp tục lượt thi đang hoạt động", () => {
    render(<ExamPreflight
      examId="00000000-0000-4000-8000-000000000000"
      listeningMinutes={40}
      readingMinutes={60}
      activeAttempts={[{
        id: "11111111-1111-4111-8111-111111111111",
        mode: "full",
        expiresAt: "2099-01-01T00:00:00.000Z",
        section: "reading",
        position: 12,
        answeredCount: 38,
        totalQuestions: 70,
      }]}
    />);

    expect(screen.getByText("Bạn đã làm 38/70 câu")).toBeTruthy();
    expect(screen.getByText(/phần Đọc, câu 12/)).toBeTruthy();
    expect(screen.getByRole("link", { name: /Tiếp tục làm bài/ }).getAttribute("href"))
      .toContain("attempt=11111111-1111-4111-8111-111111111111");
  });
});
