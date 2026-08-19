// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ExamLibraryGrid } from "./exam-library-grid";
import type { ExamSummary } from "@/lib/exams/types";

const baseExam: ExamSummary = {
  id: "exam-topik-1",
  code: "topik-i-01",
  title: "Đề TOPIK I mẫu",
  level: "topik_i",
  description: "Luyện thi sơ cấp",
  durationMinutes: 100,
  listeningDurationMinutes: 40,
  readingDurationMinutes: 60,
  status: "published",
  questionCount: 70,
  listeningQuestionCount: 30,
  readingQuestionCount: 40,
  answerReviewPolicy: "immediate",
  answerReviewAvailableAt: null,
  updatedAt: "2026-08-07T00:00:00.000Z",
};

afterEach(cleanup);

describe("ExamLibraryGrid", () => {
  it("lọc theo cấp độ và tìm kiếm không dấu", () => {
    render(
      <ExamLibraryGrid
        exams={[
          baseExam,
          { ...baseExam, id: "exam-topik-2", code: "topik-ii-02", title: "Đề nâng cao", level: "topik_ii" },
        ]}
        history={[]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "TOPIK II" }));
    expect(screen.queryByText("Đề TOPIK I mẫu")).toBeNull();
    expect(screen.getByText("Đề nâng cao")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Tất cả" }));
    fireEvent.change(screen.getByRole("searchbox", { name: "Tìm đề thi" }), { target: { value: "nang cao" } });
    expect(screen.queryByText("Đề TOPIK I mẫu")).toBeNull();
    expect(screen.getByText("Đề nâng cao")).toBeTruthy();
  });

  it("phân biệt đề chưa làm và hiển thị progress điểm cao nhất", () => {
    render(
      <ExamLibraryGrid
        exams={[baseExam, { ...baseExam, id: "exam-new", title: "Đề chưa làm" }]}
        history={[
          {
            exam_id: baseExam.id,
            code: baseExam.code,
            title: baseExam.title,
            level: "topik_i",
            attempt_count: 2,
            best_score: 150,
            best_max_score: 200,
            last_attempt_at: "2026-08-07T00:00:00.000Z",
            last_attempt_id: "attempt-1",
          },
        ]}
      />,
    );

    expect(screen.getByRole("progressbar", { name: "Điểm cao nhất 150 trên 200" }).getAttribute("aria-valuenow")).toBe("150");
    expect(screen.getByText("Chưa làm đề này")).toBeTruthy();
  });

  it("hiển thị trạng thái tải thay vì kết luận người dùng chưa làm đề", () => {
    render(<ExamLibraryGrid exams={[baseExam]} history={[]} historyPending />);

    expect(screen.getByLabelText("Đang tải điểm cao nhất")).toBeTruthy();
    expect(screen.queryByText("Chưa làm đề này")).toBeNull();
  });
});
