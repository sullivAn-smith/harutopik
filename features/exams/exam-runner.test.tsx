// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ExamRunner } from "./exam-runner";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));

const question = {
  id: "00000000-0000-4000-8000-000000000001", position: 1,
  section: "listening" as const, instruction: "Nghe", prompt: "",
  audioUrl: "https://cdn.example.com/q.mp3", imageUrl: "", options: ["1", "2", "3", "4"],
};

describe("ExamRunner listening", () => {
  it("ẩn điều khiển audio và khóa đáp án trước khi nghe xong", () => {
    const { container } = render(<ExamRunner attemptId="00000000-0000-4000-8000-000000000010" examId="00000000-0000-4000-8000-000000000020" title="TOPIK I" section="listening" expiresAt={new Date(Date.now() + 60_000).toISOString()} initialPosition={1} initialAnswers={{}} initialFlagged={[]} initialAudioPlays={{}} initialWindowLeaveCount={0} questions={[question]} />);
    expect(container.querySelector("audio")?.hasAttribute("controls")).toBe(false);
    expect((screen.getByRole("button", { name: "Đáp án 1: 1" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("button", { name: /Bắt đầu nghe/ })).toBeTruthy();
  });
});
