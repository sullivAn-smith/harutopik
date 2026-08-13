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
  it("gạch chân đúng cụm từ đã cấu hình trong câu hỏi TOPIK II", () => {
    const readingQuestion = {
      ...question,
      id: "topik-ii-reading-3",
      position: 3,
      section: "reading" as const,
      instruction: "Chọn đáp án đúng",
      prompt: "어제 본 공연은 눈물이 날 정도로 감동적이었다.",
      underlinedText: "날 정도로",
      audioUrl: "",
    };
    render(<ExamRunner attemptId="00000000-0000-4000-8000-000000000010" examId="00000000-0000-4000-8000-000000000020" title="TOPIK II" level="topik_ii" section="reading" expiresAt={new Date(Date.now() + 60_000).toISOString()} initialPosition={3} initialAnswers={{}} initialFlagged={[]} initialAudioPlays={{}} initialWindowLeaveCount={0} questions={[readingQuestion]} />);

    expect(screen.getByText("날 정도로").tagName).toBe("U");
  });

  it("xếp đáp án câu nghe TOPIK I từ 17 đến 30 theo chiều dọc", () => {
    const listeningQuestion17 = { ...question, id: "topik-i-listening-17", position: 17 };
    render(<ExamRunner attemptId="00000000-0000-4000-8000-000000000010" examId="00000000-0000-4000-8000-000000000020" title="TOPIK I" level="topik_i" section="listening" expiresAt={new Date(Date.now() + 60_000).toISOString()} initialPosition={17} initialAnswers={{}} initialFlagged={[]} initialAudioPlays={{}} initialWindowLeaveCount={0} questions={[listeningQuestion17]} />);

    const answerGrid = screen.getByRole("button", { name: "Đáp án 1: 1" }).parentElement;
    expect(answerGrid?.className).toContain("grid-cols-1");
    expect(answerGrid?.className).not.toContain("sm:grid-cols-2");
  });

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

    expect(screen.getByText("[1~2] Nghe đoạn hội thoại và trả lời")).toBeTruthy();
    expect(screen.getByText("Audio dùng chung cho câu 1~2")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /Phát audio câu/ })).toHaveLength(1);
    expect(screen.getByText("Câu hỏi 1")).toBeTruthy();
    expect(screen.getByText("Câu hỏi 2")).toBeTruthy();
  });

  it("gộp các cặp câu 25-26, 27-28 và 29-30 của TOPIK I vào từng khung chung", () => {
    const pairedQuestions = Array.from({ length: 6 }, (_, index) => {
      const position = index + 25;
      const pairStart = position % 2 === 1 ? position : position - 1;
      return {
        ...question,
        id: `topik-i-listening-${position}`,
        position,
        instruction: `Nghe và trả lời câu ${pairStart}-${pairStart + 1}`,
        prompt: `Nội dung câu ${position}`,
        audioBlockKey: `audio-${pairStart}-${pairStart + 1}`,
      };
    });

    render(<ExamRunner attemptId="00000000-0000-4000-8000-000000000010" examId="00000000-0000-4000-8000-000000000020" title="TOPIK I" level="topik_i" section="listening" expiresAt={new Date(Date.now() + 60_000).toISOString()} initialPosition={25} initialAnswers={{}} initialFlagged={[]} initialAudioPlays={{}} initialWindowLeaveCount={0} questions={pairedQuestions} />);

    for (const range of ["25-26", "27-28", "29-30"]) {
      const frame = screen.getByTestId(`shared-question-frame-${range}`);
      expect(frame.querySelectorAll("article")).toHaveLength(2);
    }
    expect(screen.getAllByRole("button", { name: /Phát audio câu/ })).toHaveLength(3);
  });

  it("gộp câu nghe 21-50 của TOPIK II thành 15 khung đôi và chỉ hiện tiêu đề chung một lần", () => {
    const pairedQuestions = Array.from({ length: 30 }, (_, index) => {
      const position = index + 21;
      const pairStart = position % 2 === 1 ? position : position - 1;
      return {
        ...question,
        id: `topik-ii-listening-${position}`,
        position,
        instruction: `Tiêu đề chung ${pairStart}-${pairStart + 1}`,
        prompt: `Câu hỏi ${position}`,
        audioBlockKey: `topik-ii-audio-${pairStart}-${pairStart + 1}`,
      };
    });

    render(<ExamRunner attemptId="00000000-0000-4000-8000-000000000010" examId="00000000-0000-4000-8000-000000000020" title="TOPIK II" level="topik_ii" section="listening" expiresAt={new Date(Date.now() + 60_000).toISOString()} initialPosition={21} initialAnswers={{}} initialFlagged={[]} initialAudioPlays={{}} initialWindowLeaveCount={0} questions={pairedQuestions} />);

    for (let start = 21; start <= 49; start += 2) {
      const range = `${start}-${start + 1}`;
      expect(screen.getByTestId(`shared-question-frame-${range}`).querySelectorAll("article")).toHaveLength(2);
      expect(screen.getAllByText(`[${start}~${start + 1}] Tiêu đề chung ${range}`)).toHaveLength(1);
    }
    expect(screen.getAllByRole("button", { name: /Phát audio câu/ })).toHaveLength(15);
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

  it("gộp câu 49-50 thành một khung, dùng chung bài đọc và đổi bố cục đáp án theo từng câu", () => {
    const sharedPassage = "저는 다음 주에 새 집으로 이사합니다. 그래서 오늘 제 물건을 정리했습니다.";
    const sharedReadingQuestions = [19, 20].map((position) => ({
      ...question,
      id: `topik-i-reading-${position + 30}`,
      position,
      section: "reading" as const,
      instruction: "다음을 읽고 물음에 답하십시오.",
      prompt: position === 19 ? "㉠에 들어갈 알맞은 말을 고르십시오." : "이 글의 내용과 같은 것을 고르십시오.",
      passage: sharedPassage,
      passageBlockKey: "reading-49-50",
      audioUrl: "",
      options: position === 19
        ? ["필요한", "새로운", "정리한", "사용한"]
        : ["집에 새 물건들이 많이 필요합니다.", "저는 오늘 새 집에 이사를 왔습니다.", "저는 필요 없는 물건을 정리했습니다.", "상자에 많이 쓰는 물건들이 있습니다."],
    }));

    render(<ExamRunner attemptId="00000000-0000-4000-8000-000000000010" examId="00000000-0000-4000-8000-000000000020" title="TOPIK I" level="topik_i" section="reading" expiresAt={new Date(Date.now() + 60_000).toISOString()} initialPosition={19} initialAnswers={{}} initialFlagged={[]} initialAudioPlays={{}} initialWindowLeaveCount={0} questions={sharedReadingQuestions} />);

    const frame = screen.getByTestId("shared-question-frame-49-50");
    expect(frame.querySelectorAll("article")).toHaveLength(2);
    expect(screen.getByText("[49~50] 다음을 읽고 물음에 답하십시오.").className).toContain("font-bold");
    expect(screen.getByText(sharedPassage).className).toContain("font-normal");
    expect(screen.getByText("㉠에 들어갈 알맞은 말을 고르십시오.").className).toContain("font-normal");
    expect(screen.getByRole("button", { name: "Đáp án 1: 필요한" }).parentElement?.className).toContain("sm:grid-cols-2");
    expect(screen.getByRole("button", { name: "Đáp án 1: 필요한" }).className).toContain("font-normal");
    expect(screen.getByRole("button", { name: "Đáp án 1: 집에 새 물건들이 많이 필요합니다." }).parentElement?.className).toContain("grid-cols-1");
    expect(screen.getByRole("button", { name: "Đáp án 1: 집에 새 물건들이 많이 필요합니다." }).parentElement?.className).not.toContain("sm:grid-cols-2");
  });

  it("hiển thị riêng đáp án câu 52 theo bố cục hai cột", () => {
    const pairQuestions = [21, 22].map((position) => ({
      ...question,
      id: `topik-i-reading-${position + 30}`,
      position,
      section: "reading" as const,
      instruction: "다음을 읽고 물음에 답하십시오.",
      prompt: position === 21 ? "㉠에 들어갈 알맞은 말을 고르십시오." : "무엇에 대한 이야기인지 고르십시오.",
      passage: "겨울에 기차를 타고 떠나는 눈꽃 여행이 있습니다.",
      passageBlockKey: "reading-51-52",
      audioUrl: "",
      options: position === 21
        ? ["기차가 지나가서", "기차를 기다려서", "기차역에 내려서", "기차역에 돌아와서"]
        : ["기차 안에서 볼 수 있는 것", "기차를 다시 탈 수 있는 곳", "눈꽃 여행을 갈 수 있는 날", "눈꽃 여행에서 할 수 있는 일"],
    }));

    render(<ExamRunner attemptId="00000000-0000-4000-8000-000000000010" examId="00000000-0000-4000-8000-000000000020" title="TOPIK I" level="topik_i" section="reading" expiresAt={new Date(Date.now() + 60_000).toISOString()} initialPosition={21} initialAnswers={{}} initialFlagged={[]} initialAudioPlays={{}} initialWindowLeaveCount={0} questions={pairQuestions} />);

    expect(screen.getByTestId("shared-question-frame-51-52").querySelectorAll("article")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Đáp án 1: 기차 안에서 볼 수 있는 것" }).parentElement?.className).toContain("sm:grid-cols-2");
    expect(screen.getByRole("button", { name: "Đáp án 1: 기차 안에서 볼 수 있는 것" }).parentElement?.className).not.toContain("grid-cols-1");
  });

  it("tách câu 57 và 58 trên giao diện kể cả khi đề cũ còn mã bài đọc chung", () => {
    const legacyQuestions = [27, 28].map((position) => ({
      ...question,
      id: `topik-i-reading-${position + 30}`,
      position,
      section: "reading" as const,
      instruction: `Tiêu đề riêng câu ${position + 30}`,
      prompt: `Câu hỏi riêng ${position + 30}`,
      passage: `Bài đọc riêng ${position + 30}`,
      passageBlockKey: "legacy-reading-57-58",
      audioUrl: "",
      imageUrl: `https://cdn.example.com/question-${position + 30}.png`,
    }));

    render(<ExamRunner attemptId="00000000-0000-4000-8000-000000000010" examId="00000000-0000-4000-8000-000000000020" title="TOPIK I" level="topik_i" section="reading" expiresAt={new Date(Date.now() + 60_000).toISOString()} initialPosition={27} initialAnswers={{}} initialFlagged={[]} initialAudioPlays={{}} initialWindowLeaveCount={0} questions={legacyQuestions} />);

    expect(screen.queryByTestId("shared-question-frame-57-58")).toBeNull();
    expect(screen.getByText("Bài đọc riêng 57")).toBeTruthy();
    expect(screen.getByText("Bài đọc riêng 58")).toBeTruthy();
    expect(screen.getByText("Câu hỏi riêng 57")).toBeTruthy();
    expect(screen.getByText("Câu hỏi riêng 58")).toBeTruthy();
    for (const position of [27, 28]) {
      const displayPosition = position + 30;
      const title = screen.getByText(`Tiêu đề riêng câu ${displayPosition}`);
      const passage = screen.getByText(`Bài đọc riêng ${displayPosition}`);
      const image = screen.getByAltText(`Ngữ liệu câu ${position}`);
      expect(title.compareDocumentPosition(passage) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(title.compareDocumentPosition(image) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(title.className).toContain("font-bold");
    }
    expect(screen.queryByText(/※ \[57~58\]/)).toBeNull();
  });

  it("hiển thị câu hỏi riêng 2 của câu 59 trong khung chữ nhật và xếp đáp án ngang", () => {
    const readingQuestion59 = {
      ...question,
      id: "topik-i-reading-59",
      position: 29,
      section: "reading" as const,
      instruction: "다음 문장이 들어갈 곳을 고르십시오.",
      prompt: "다음 문장이 들어갈 곳을 고르십시오.",
      secondaryPrompt: "그래서 소금을 적게 먹으려면 라면 국물을 먹지 않는 게 좋습니다.",
      passage: "",
      passageBlockKey: "reading-59-60",
      audioUrl: "",
      options: ["㉠", "㉡", "㉢", "㉣"],
    };

    render(<ExamRunner attemptId="00000000-0000-4000-8000-000000000010" examId="00000000-0000-4000-8000-000000000020" title="TOPIK I" level="topik_i" section="reading" expiresAt={new Date(Date.now() + 60_000).toISOString()} initialPosition={29} initialAnswers={{}} initialFlagged={[]} initialAudioPlays={{}} initialWindowLeaveCount={0} questions={[readingQuestion59]} />);

    const secondaryPrompt = screen.getByText(readingQuestion59.secondaryPrompt);
    expect(secondaryPrompt.parentElement?.className).toContain("border-slate-500");
    expect(secondaryPrompt.parentElement?.className).not.toContain("rounded-2xl");
    expect(secondaryPrompt.className).toContain("font-normal");
    expect(screen.queryByText("＜보기＞")).toBeNull();
    expect(screen.getByRole("button", { name: "Đáp án 1: ㉠" }).parentElement?.className).toContain("xl:grid-cols-4");
    expect(screen.getByRole("button", { name: "Đáp án 1: ㉠" }).className).toContain("font-normal");
  });

  it("xếp bốn đáp án câu 62 theo chiều dọc", () => {
    const readingQuestion62 = {
      ...question,
      id: "topik-i-reading-62",
      position: 32,
      section: "reading" as const,
      instruction: "다음을 읽고 물음에 답하십시오.",
      prompt: "이 글의 내용과 같은 것을 고르십시오.",
      passage: "Câu 62 dùng bài đọc của nhóm câu 61–62.",
      passageBlockKey: "reading-61-62",
      audioUrl: "",
      options: ["Đáp án câu 62 số 1", "Đáp án câu 62 số 2", "Đáp án câu 62 số 3", "Đáp án câu 62 số 4"],
    };

    render(<ExamRunner attemptId="00000000-0000-4000-8000-000000000010" examId="00000000-0000-4000-8000-000000000020" title="TOPIK I" level="topik_i" section="reading" expiresAt={new Date(Date.now() + 60_000).toISOString()} initialPosition={32} initialAnswers={{}} initialFlagged={[]} initialAudioPlays={{}} initialWindowLeaveCount={0} questions={[readingQuestion62]} />);

    expect(screen.getByRole("button", { name: "Đáp án 1: Đáp án câu 62 số 1" }).parentElement?.className).toContain("grid-cols-1");
    expect(screen.getByRole("button", { name: "Đáp án 1: Đáp án câu 62 số 1" }).parentElement?.className).not.toContain("sm:grid-cols-2");
  });

  it("gộp câu 59-60 và 61-62 vào hai khung chung riêng biệt", () => {
    const pairedQuestions = [29, 30, 31, 32].map((position) => {
      const pairStart = position % 2 === 1 ? position : position - 1;
      const displayPosition = position + 30;
      return {
        ...question,
        id: `topik-i-reading-${displayPosition}`,
        position,
        section: "reading" as const,
        instruction: `Tiêu đề nhóm ${pairStart + 30}-${pairStart + 31}`,
        prompt: `Câu hỏi ${displayPosition}`,
        secondaryPrompt: position === 29 ? "Câu hỏi riêng 2 của câu 59" : "",
        passage: `Bài đọc chung câu ${pairStart + 30}-${pairStart + 31}`,
        passageBlockKey: `reading-${pairStart + 30}-${pairStart + 31}`,
        audioUrl: "",
        options: [1, 2, 3, 4].map((optionIndex) => `Đáp án ${displayPosition}-${optionIndex}`),
      };
    });

    render(<ExamRunner attemptId="00000000-0000-4000-8000-000000000010" examId="00000000-0000-4000-8000-000000000020" title="TOPIK I" level="topik_i" section="reading" expiresAt={new Date(Date.now() + 60_000).toISOString()} initialPosition={29} initialAnswers={{}} initialFlagged={[]} initialAudioPlays={{}} initialWindowLeaveCount={0} questions={pairedQuestions} />);

    for (const range of ["59-60", "61-62"]) {
      expect(screen.getByTestId(`shared-question-frame-${range}`).querySelectorAll("article")).toHaveLength(2);
      expect(screen.getAllByText(`Bài đọc chung câu ${range}`)).toHaveLength(1);
    }
    expect(screen.getByText("Câu hỏi riêng 2 của câu 59")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Đáp án 1: Đáp án 62-1" }).parentElement?.className).toContain("grid-cols-1");
  });

  it("gộp các cặp câu 63-70 và áp dụng đúng bố cục ảnh, bài đọc và đáp án", () => {
    const pairedQuestions = Array.from({ length: 8 }, (_, index) => {
      const position = index + 33;
      const displayPosition = position + 30;
      const pairStart = position % 2 === 1 ? position : position - 1;
      return {
        ...question,
        id: `topik-i-reading-${displayPosition}`,
        position,
        section: "reading" as const,
        instruction: `다음을 읽고 물음에 답하십시오. ${pairStart + 30}-${pairStart + 31}`,
        prompt: `Câu hỏi ${displayPosition}`,
        passage: pairStart === 33 ? "" : `Bài đọc chung câu ${pairStart + 30}-${pairStart + 31}`,
        passageBlockKey: `reading-${pairStart + 30}-${pairStart + 31}`,
        audioUrl: "",
        imageUrl: pairStart === 33 ? "https://cdn.example.com/question-63-64.png" : "",
        options: [1, 2, 3, 4].map((optionIndex) => `Lựa chọn ${displayPosition}-${optionIndex}`),
      };
    });

    render(<ExamRunner attemptId="00000000-0000-4000-8000-000000000010" examId="00000000-0000-4000-8000-000000000020" title="TOPIK I" level="topik_i" section="reading" expiresAt={new Date(Date.now() + 60_000).toISOString()} initialPosition={33} initialAnswers={{}} initialFlagged={[]} initialAudioPlays={{}} initialWindowLeaveCount={0} questions={pairedQuestions} />);

    for (const range of ["63-64", "65-66", "67-68", "69-70"]) {
      const sharedFrame = screen.getByTestId(`shared-question-frame-${range}`);
      expect(sharedFrame.querySelectorAll("article")).toHaveLength(2);
      expect(sharedFrame.className).not.toContain("border-black");
      expect(sharedFrame.className).not.toContain("divide-black");
      expect(sharedFrame.className).toContain("rounded-3xl");
      expect(sharedFrame.className).toContain("bg-white");
      expect(sharedFrame.className).toContain("shadow-sm");
    }
    const promptImage = screen.getByAltText("Ngữ liệu câu 33");
    expect(promptImage.className).toContain("max-w-[920px]");
    expect(promptImage.className).toContain("border-black");
    expect(promptImage.className).toContain("border-[3px]");
    expect(promptImage.className).toContain("exam-material-frame");
    expect(promptImage.parentElement?.className).not.toContain("xl:grid-cols");
    for (const displayPosition of [63, 64, 65, 66, 70]) {
      expect(screen.getByRole("button", { name: `Đáp án 1: Lựa chọn ${displayPosition}-1` }).parentElement?.className).toContain("grid-cols-1");
    }
    for (const displayPosition of [67, 68, 69]) {
      expect(screen.getByRole("button", { name: `Đáp án 1: Lựa chọn ${displayPosition}-1` }).parentElement?.className).toContain("sm:grid-cols-2");
    }
    for (const range of ["65-66", "67-68", "69-70"]) {
      expect(screen.getAllByText(`Bài đọc chung câu ${range}`)).toHaveLength(1);
      expect(screen.getByText(`Bài đọc chung câu ${range}`).parentElement?.className).toContain("border-black");
      expect(screen.getByText(`Bài đọc chung câu ${range}`).parentElement?.className).toContain("border-[3px]");
      expect(screen.getByText(`Bài đọc chung câu ${range}`).parentElement?.className).toContain("exam-material-frame");
    }
  });

  it("hiển thị câu 31–39 trong khung ngang và không hiện ngữ liệu cũ của câu 31–48", () => {
    const boxedReading = {
      ...question,
      id: "topik-i-reading-31",
      position: 1,
      section: "reading" as const,
      instruction: "무엇에 대한 이야기입니까? 알맞은 것을 고르십시오.",
      prompt: "오늘은 1월 1일입니다. 내일은 1월 2일입니다.",
      passage: "Ngữ liệu cũ câu 31",
      audioUrl: "",
      options: ["날짜", "방학", "아침", "하루"],
    };
    const standaloneReading = {
      ...boxedReading,
      id: "topik-i-reading-43",
      position: 13,
      prompt: "Nội dung câu 43",
      passage: "Ngữ liệu cũ câu 43",
    };

    render(<ExamRunner attemptId="00000000-0000-4000-8000-000000000010" examId="00000000-0000-4000-8000-000000000020" title="TOPIK I" level="topik_i" section="reading" expiresAt={new Date(Date.now() + 60_000).toISOString()} initialPosition={1} initialAnswers={{}} initialFlagged={[]} initialAudioPlays={{}} initialWindowLeaveCount={0} questions={[boxedReading, standaloneReading]} />);

    expect(screen.getByText(boxedReading.prompt).className).toContain("border-black");
    expect(screen.getByText(boxedReading.prompt).className).toContain("border-[3px]");
    expect(screen.getAllByRole("button", { name: "Đáp án 1: 날짜" })[0].parentElement?.className).toContain("xl:grid-cols-4");
    expect(screen.getByText(standaloneReading.prompt).className).toContain("border-black");
    expect(screen.getByText(standaloneReading.prompt).className).toContain("border-[3px]");
    expect(screen.getAllByRole("button", { name: "Đáp án 1: 날짜" })[1].parentElement?.className).toContain("grid-cols-1");
    expect(screen.getAllByRole("button", { name: "Đáp án 1: 날짜" })[1].parentElement?.className).not.toContain("xl:grid-cols-4");
    expect(screen.queryByText("Ngữ liệu cũ câu 31")).toBeNull();
    expect(screen.queryByText("Ngữ liệu cũ câu 43")).toBeNull();
  });

  it("hiển thị ảnh đề câu 40–42 thành khung lớn phía trên và đáp án phía dưới", () => {
    const practicalQuestion = {
      ...question,
      id: "topik-i-reading-40",
      position: 10,
      section: "reading" as const,
      instruction: "다음을 읽고 맞지 않는 것을 고르십시오.",
      prompt: "",
      audioUrl: "",
      imageUrl: "https://cdn.example.com/question-40.png",
      options: ["오천 원을 냅니다.", "월요일에 문을 엽니다.", "어린이가 갈 수 있습니다.", "오후 일곱 시에 끝납니다."],
    };

    render(<ExamRunner attemptId="00000000-0000-4000-8000-000000000010" examId="00000000-0000-4000-8000-000000000020" title="TOPIK I" level="topik_i" section="reading" expiresAt={new Date(Date.now() + 60_000).toISOString()} initialPosition={10} initialAnswers={{}} initialFlagged={[]} initialAudioPlays={{}} initialWindowLeaveCount={0} questions={[practicalQuestion]} />);

    const image = screen.getByAltText("Ngữ liệu câu 10");
    const title = screen.getByText(practicalQuestion.instruction);
    expect(image.className).toContain("max-w-[920px]");
    expect(image.className).toContain("border-black");
    expect(image.className).toContain("border-[3px]");
    expect(image.parentElement?.className).not.toContain("xl:grid-cols");
    expect(title.compareDocumentPosition(image) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(title.className).toContain("font-bold");
    expect(screen.getByRole("button", { name: `Đáp án 1: ${practicalQuestion.options[0]}` }).parentElement?.className).toContain("grid-cols-1");
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
