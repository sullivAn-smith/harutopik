// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExamRunner } from "./exam-runner";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));

class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
  vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const question = {
  id: "00000000-0000-4000-8000-000000000001", position: 1,
  section: "listening" as const, instruction: "Nghe", prompt: "",
  audioBlockKey: "", answerType: "text" as const,
  audioUrl: "https://cdn.example.com/q.mp3", imageUrl: "", options: ["1", "2", "3", "4"], optionImages: ["", "", "", ""],
};

describe("ExamRunner listening", () => {
  it("không ghi nhận rời cửa sổ khi hộp xác nhận nộp bài làm phát sinh blur", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({ data: {} }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.spyOn(window, "confirm").mockImplementation(() => {
      window.dispatchEvent(new Event("blur"));
      return true;
    });
    render(<ExamRunner attemptId="00000000-0000-4000-8000-000000000010" examId="00000000-0000-4000-8000-000000000020" title="TOPIK I" section="listening" expiresAt={new Date(Date.now() + 60_000).toISOString()} initialPosition={1} initialAnswers={{}} initialFlagged={[]} initialAudioPlays={{}} initialWindowLeaveCount={0} questions={[question]} />);

    fireEvent.click(screen.getByRole("button", { name: "Nộp bài" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/submit"), { method: "POST" }));
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/window-event"))).toBe(false);
  });

  it("ẩn điều khiển audio gốc và khóa đáp án trước khi bắt đầu nghe", () => {
    const { container } = render(<ExamRunner attemptId="00000000-0000-4000-8000-000000000010" examId="00000000-0000-4000-8000-000000000020" title="TOPIK I" section="listening" expiresAt={new Date(Date.now() + 60_000).toISOString()} initialPosition={1} initialAnswers={{}} initialFlagged={[]} initialAudioPlays={{}} initialWindowLeaveCount={0} questions={[question]} />);
    expect(container.querySelector("audio")?.hasAttribute("controls")).toBe(false);
    expect((screen.getByRole("button", { name: "Đáp án 1: 1" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("button", { name: "Phát audio câu 1" })).toBeTruthy();
    expect((screen.getByRole("slider", { name: "Tua audio câu 1" }) as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByText("Bạn có thể tạm dừng, tua và nghe lại không giới hạn.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Listening" }).className).toContain("bg-[#087eba]");
    expect(screen.queryByRole("button", { name: "Reading" })).toBeNull();
    expect(screen.getByRole("button", { name: "Nộp bài" })).toBeTruthy();
  });

  it("cho phát, tua và nghe lại audio không giới hạn mà không gọi API lượt nghe", async () => {
    const playMock = vi.mocked(HTMLMediaElement.prototype.play);
    const pauseMock = vi.mocked(HTMLMediaElement.prototype.pause);
    const loadMock = vi.mocked(HTMLMediaElement.prototype.load);
    const fetchMock = vi.spyOn(global, "fetch");
    const { container } = render(<ExamRunner attemptId="00000000-0000-4000-8000-000000000010" examId="00000000-0000-4000-8000-000000000020" title="TOPIK I" section="listening" expiresAt={new Date(Date.now() + 60_000).toISOString()} initialPosition={1} initialAnswers={{}} initialFlagged={[]} initialAudioPlays={{}} initialWindowLeaveCount={0} questions={[question]} />);

    fireEvent.click(screen.getByRole("button", { name: "Phát audio câu 1" }));
    await waitFor(() => expect(playMock).toHaveBeenCalledTimes(1));
    expect(pauseMock).toHaveBeenCalledTimes(1);
    expect(loadMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
    expect((screen.getByRole("button", { name: "Đáp án 1: 1" }) as HTMLButtonElement).disabled).toBe(false);

    const audio = container.querySelector("audio") as HTMLAudioElement;
    Object.defineProperty(audio, "duration", { configurable: true, value: 75 });
    fireEvent.loadedMetadata(audio);
    fireEvent.change(screen.getByRole("slider", { name: "Tua audio câu 1" }), { target: { value: "30" } });
    expect(audio.currentTime).toBe(30);
    expect(screen.getByText("00:30")).toBeTruthy();
    expect(screen.getByText("01:15")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "↻ Nghe lại" }));
    await waitFor(() => expect(playMock).toHaveBeenCalledTimes(2));
    expect(audio.currentTime).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("hiện toàn bộ câu theo dạng cuộn và chuyển Listening/Reading tự do", async () => {
    const secondListening = {
      ...question,
      id: "00000000-0000-4000-8000-000000000002",
      position: 2,
      instruction: "Câu nghe thứ hai",
      audioUrl: "",
    };
    const reading = {
      ...question,
      id: "00000000-0000-4000-8000-000000000003",
      position: 1,
      section: "reading" as const,
      instruction: "Câu đọc đầu tiên",
      audioUrl: "",
    };
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: { section: "reading" } }), { status: 200, headers: { "content-type": "application/json" } }),
    );

    render(<ExamRunner attemptId="00000000-0000-4000-8000-000000000010" examId="00000000-0000-4000-8000-000000000020" title="TOPIK I" section="listening" expiresAt={new Date(Date.now() + 60_000).toISOString()} initialPosition={1} initialAnswers={{}} initialFlagged={[]} initialAudioPlays={{}} initialWindowLeaveCount={0} questions={[question, secondListening, reading]} />);

    expect(screen.getByText("Câu nghe thứ hai")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sang phần Đọc →" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Reading" }));

    await waitFor(() => expect(screen.getByText("Câu đọc đầu tiên")).toBeTruthy());
    expect(screen.getByRole("button", { name: "Listening" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Nộp bài" })).toBeTruthy();
  });

  it("cho làm câu nghe không có audio mà không hiện nút phát", () => {
    render(<ExamRunner attemptId="00000000-0000-4000-8000-000000000010" examId="00000000-0000-4000-8000-000000000020" title="TOPIK I" section="listening" expiresAt={new Date(Date.now() + 60_000).toISOString()} initialPosition={1} initialAnswers={{}} initialFlagged={[]} initialAudioPlays={{}} initialWindowLeaveCount={0} questions={[{ ...question, audioUrl: "" }]} />);

    expect(screen.queryByRole("button", { name: /Phát audio/ })).toBeNull();
    expect((screen.getByRole("button", { name: "Đáp án 1: 1" }) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.getByText("Câu này không có audio.")).toBeTruthy();
  });

  it("chỉ hiển thị phần Đọc khi người học chọn chế độ Đọc", () => {
    const reading = {
      ...question,
      id: "00000000-0000-4000-8000-000000000003",
      position: 1,
      section: "reading" as const,
      instruction: "Đọc và chọn đáp án",
      audioUrl: "",
    };

    render(<ExamRunner attemptId="00000000-0000-4000-8000-000000000010" examId="00000000-0000-4000-8000-000000000020" title="TOPIK I" section="reading" expiresAt={new Date(Date.now() + 60_000).toISOString()} initialPosition={1} initialAnswers={{}} initialFlagged={[]} initialAudioPlays={{}} initialWindowLeaveCount={0} questions={[reading]} />);

    expect(screen.queryByRole("button", { name: "Listening" })).toBeNull();
    expect(screen.getByRole("button", { name: "Reading" })).toBeTruthy();
    expect(screen.getByText("Đọc và chọn đáp án")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Nộp bài" })).toBeTruthy();
  });

  it("hiển thị audio chung một lần và giữ đủ hai câu trong nhóm", () => {
    const sharedQuestions = [1, 2].map((position) => ({
      ...question,
      id: `00000000-0000-4000-8000-00000000000${position}`,
      position,
      instruction: "Nghe đoạn hội thoại và trả lời",
      prompt: `Câu hỏi ${position}`,
      audioBlockKey: "audio-21-22",
    }));

    render(<ExamRunner attemptId="00000000-0000-4000-8000-000000000010" examId="00000000-0000-4000-8000-000000000020" title="TOPIK II" section="listening" expiresAt={new Date(Date.now() + 60_000).toISOString()} initialPosition={1} initialAnswers={{}} initialFlagged={[]} initialAudioPlays={{}} initialWindowLeaveCount={0} questions={sharedQuestions} />);

    expect(screen.getByText("※ [1~2] Nghe đoạn hội thoại và trả lời")).toBeTruthy();
    expect(screen.getByText("Audio dùng chung cho câu 1~2")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /Phát audio câu/ })).toHaveLength(1);
    expect(screen.getByText("Câu hỏi 1")).toBeTruthy();
    expect(screen.getByText("Câu hỏi 2")).toBeTruthy();
  });

  it("hiển thị ảnh đề, bốn ảnh đáp án và câu hỏi hiển thị thứ hai", () => {
    const promptImageQuestion = {
      ...question,
      section: "reading" as const,
      audioUrl: "",
      instruction: "Chọn đáp án đúng",
      prompt: "Câu hỏi chính",
      secondaryPrompt: "Câu hỏi riêng 2",
      answerType: "text" as const,
      imageUrl: "https://cdn.example.com/prompt.png",
    };
    const imageAnswerQuestion = {
      ...question,
      id: "00000000-0000-4000-8000-000000000002",
      position: 2,
      section: "reading" as const,
      audioUrl: "",
      answerType: "image" as const,
      imageUrl: "",
      optionImages: [1, 2, 3, 4].map((index) => `https://cdn.example.com/answer-${index}.png`),
    };

    render(<ExamRunner attemptId="00000000-0000-4000-8000-000000000010" examId="00000000-0000-4000-8000-000000000020" title="TOPIK II" section="reading" expiresAt={new Date(Date.now() + 60_000).toISOString()} initialPosition={1} initialAnswers={{}} initialFlagged={[]} initialAudioPlays={{}} initialWindowLeaveCount={0} questions={[promptImageQuestion, imageAnswerQuestion]} />);

    expect(screen.getByAltText("Ngữ liệu câu 1").className).toContain("object-contain");
    expect(screen.getByText("Câu hỏi riêng 2")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /Chọn ảnh đáp án/ })).toHaveLength(4);
    expect(screen.getByAltText("Đáp án 4").className).toContain("object-contain");
  });

  it("đánh số phần Đọc TOPIK I từ 31 đến 70 cả trong bài và danh sách câu", () => {
    const readingQuestions = Array.from({ length: 40 }, (_, index) => ({
      ...question,
      id: `reading-${index + 1}`,
      position: index + 1,
      section: "reading" as const,
      instruction: `Câu đọc ${index + 31}`,
      audioUrl: "",
    }));

    render(<ExamRunner attemptId="00000000-0000-4000-8000-000000000010" examId="00000000-0000-4000-8000-000000000020" title="TOPIK I" section="reading" expiresAt={new Date(Date.now() + 60_000).toISOString()} initialPosition={1} initialAnswers={{}} initialFlagged={[]} initialAudioPlays={{}} initialWindowLeaveCount={0} questions={readingQuestions} />);

    expect(screen.getAllByText("31").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("70").length).toBeGreaterThanOrEqual(2);
  });

  it("hiện thanh chọn màu và tô màu ngay khi người học chọn", async () => {
    const { container } = render(<ExamRunner attemptId="00000000-0000-4000-8000-000000000010" examId="00000000-0000-4000-8000-000000000020" title="TOPIK I" section="listening" expiresAt={new Date(Date.now() + 60_000).toISOString()} initialPosition={1} initialAnswers={{}} initialFlagged={[]} initialAudioPlays={{}} initialWindowLeaveCount={0} questions={[question]} />);

    const instruction = screen.getByText("Nghe");
    const range = {
      commonAncestorContainer: instruction.firstChild,
      cloneRange() {
        return {
          selectNodeContents: vi.fn(),
          setEnd: vi.fn(),
          toString: () => "",
        };
      },
      getBoundingClientRect() { return { top: 120, left: 80 }; },
      toString: () => "Nghe",
    } as unknown as Range;
    const selection = {
      toString: () => "Nghe",
      rangeCount: 1,
      getRangeAt: () => range,
      anchorNode: instruction.firstChild,
      removeAllRanges: vi.fn(),
    } as unknown as Selection;
    const selectionSpy = vi.spyOn(window, "getSelection").mockReturnValue(selection);
    vi.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({ data: { id: "00000000-0000-4000-8000-000000000099" } }), { status: 200, headers: { "content-type": "application/json" } }));

    fireEvent.mouseUp(instruction);

    expect(screen.getByRole("toolbar", { name: "Chọn màu highlight" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Highlight màu vàng" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Highlight màu vàng" }));
    expect(container.querySelector("mark")?.textContent).toBe("Nghe");
    await waitFor(() => expect(container.querySelector("mark")?.textContent).toBe("Nghe"));
    selectionSpy.mockRestore();
  });

  it("giữ màu trên màn hình và cho thử đồng bộ lại khi API tạm lỗi", async () => {
    const { container } = render(<ExamRunner attemptId="00000000-0000-4000-8000-000000000010" examId="00000000-0000-4000-8000-000000000020" title="TOPIK I" section="listening" expiresAt={new Date(Date.now() + 60_000).toISOString()} initialPosition={1} initialAnswers={{}} initialFlagged={[]} initialAudioPlays={{}} initialWindowLeaveCount={0} questions={[question]} />);

    const instruction = screen.getByText("Nghe");
    const range = {
      commonAncestorContainer: instruction.firstChild,
      cloneRange() {
        return { selectNodeContents: vi.fn(), setEnd: vi.fn(), toString: () => "" };
      },
      getBoundingClientRect() { return { top: 120, left: 80 }; },
      toString: () => "Nghe",
    } as unknown as Range;
    vi.spyOn(window, "getSelection").mockReturnValue({
      toString: () => "Nghe",
      rangeCount: 1,
      getRangeAt: () => range,
      anchorNode: instruction.firstChild,
      removeAllRanges: vi.fn(),
    } as unknown as Selection);
    const fetchMock = vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: "Mất kết nối" } }), { status: 503, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { id: "00000000-0000-4000-8000-000000000099" } }), { status: 200, headers: { "content-type": "application/json" } }));

    fireEvent.mouseUp(instruction);
    fireEvent.click(screen.getByRole("button", { name: "Highlight màu xanh" }));

    await waitFor(() => expect(screen.getByText(/Màu đã hiển thị nhưng chưa đồng bộ/)).toBeTruthy());
    expect(container.querySelector("mark")?.textContent).toBe("Nghe");
    expect(container.querySelector("mark")?.className).toContain("bg-cyan-200");

    fireEvent.click(screen.getByRole("button", { name: "Highlight màu xanh" }));
    await waitFor(() => expect(screen.getByText("Đã lưu “Nghe” vào highlight.")).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("lưu đoạn bôi đen vào một bộ từ hiện có", async () => {
    render(<ExamRunner attemptId="00000000-0000-4000-8000-000000000010" examId="00000000-0000-4000-8000-000000000020" title="TOPIK I" section="listening" expiresAt={new Date(Date.now() + 60_000).toISOString()} initialPosition={1} initialAnswers={{}} initialFlagged={[]} initialAudioPlays={{}} initialWindowLeaveCount={0} questions={[question]} />);

    const instruction = screen.getByText("Nghe");
    const range = {
      commonAncestorContainer: instruction.firstChild,
      cloneRange() {
        return {
          selectNodeContents: vi.fn(),
          setEnd: vi.fn(),
          toString: () => "",
        };
      },
      getBoundingClientRect() { return { top: 120, left: 80 }; },
      toString: () => "Nghe",
    } as unknown as Range;
    vi.spyOn(window, "getSelection").mockReturnValue({
      toString: () => "Nghe",
      rangeCount: 1,
      getRangeAt: () => range,
      anchorNode: instruction.firstChild,
      removeAllRanges: vi.fn(),
    } as unknown as Selection);
    const fetchMock = vi.spyOn(global, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith("/highlights") && init?.method === "POST") {
        return new Response(JSON.stringify({ data: { id: "00000000-0000-4000-8000-000000000099" } }), { status: 200, headers: { "content-type": "application/json" } });
      }
      if (url === "/api/v1/vocabulary-lists") {
        return new Response(JSON.stringify({ data: [{ id: "00000000-0000-4000-8000-000000000088", name: "Từ cần ôn", kind: "custom", itemCount: 2 }] }), { status: 200, headers: { "content-type": "application/json" } });
      }
      if (url.endsWith("/review") && init?.method === "POST") {
        return new Response(JSON.stringify({ data: { listId: "00000000-0000-4000-8000-000000000088", listName: "Từ cần ôn" } }), { status: 200, headers: { "content-type": "application/json" } });
      }
      return new Response(JSON.stringify({ error: { message: "Unexpected request" } }), { status: 500, headers: { "content-type": "application/json" } });
    });

    fireEvent.mouseUp(instruction);
    fireEvent.click(screen.getByRole("button", { name: "Lưu vào bộ từ ôn tập" }));

    const listButton = await screen.findByRole("button", { name: /Từ cần ôn/ });
    fireEvent.click(listButton);
    await waitFor(() => expect(screen.getByText("Đã lưu “Nghe” vào “Từ cần ôn”.")).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/exam-attempts/00000000-0000-4000-8000-000000000010/highlights/00000000-0000-4000-8000-000000000099/review",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("cho người học bấm vào đoạn đã tô để xóa highlight", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: { deleted: true } }), { status: 200, headers: { "content-type": "application/json" } }),
    );
    const { container } = render(<ExamRunner
      attemptId="00000000-0000-4000-8000-000000000010"
      examId="00000000-0000-4000-8000-000000000020"
      title="TOPIK I"
      section="listening"
      expiresAt={new Date(Date.now() + 60_000).toISOString()}
      initialPosition={1}
      initialAnswers={{}}
      initialFlagged={[]}
      initialAudioPlays={{}}
      initialWindowLeaveCount={0}
      initialHighlights={[{
        id: "00000000-0000-4000-8000-000000000099",
        questionId: question.id,
        sourceField: "instruction",
        sourceIndex: null,
        selectedText: "Nghe",
        prefixText: "",
        suffixText: "",
        color: "yellow",
        reviewListId: "00000000-0000-4000-8000-000000000088",
      }]}
      questions={[question]}
    />);

    fireEvent.click(screen.getByTitle("Bấm để quản lý highlight"));
    fireEvent.click(screen.getByRole("button", { name: "Xóa highlight" }));

    await waitFor(() => expect(container.querySelector("mark")).toBeNull());
    expect(screen.getByText(/Từ đã lưu trong bộ từ vẫn được giữ/)).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/exam-attempts/00000000-0000-4000-8000-000000000010/highlights/00000000-0000-4000-8000-000000000099",
      { method: "DELETE" },
    );
  });
});
