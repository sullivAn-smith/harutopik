// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DictationExercise } from "./dictation-exercise";
import { FlashcardExercise } from "./flashcard-exercise";
import { MatchingExercise } from "./matching-exercise";
import { ModeNavigation } from "./mode-navigation";
import { QuizExercise } from "./quiz-exercise";
import { TranslationExercise } from "./translation-exercise";
import { TypingExercise } from "./typing-exercise";

afterEach(cleanup);

describe("FlashcardExercise", () => {
  const word = {
    id: "vocabulary-01",
    korean: "한국",
    vietnamese: "Hàn Quốc",
    romanization: "han-guk",
    category: "Quốc gia",
    imageUrl: "/vocab-country-0.png",
    audioUrl: "https://cdn.example/azure-word.mp3",
    examples: [],
  };

  it("lật thẻ, phát âm và quản lý trạng thái đã thuộc", () => {
    const onFlip = vi.fn();
    const onSpeak = vi.fn();
    const onMarkLearned = vi.fn();
    render(
      <FlashcardExercise
        lessonId="lesson-test"
        word={word}
        position={0}
        total={55}
        learnedCount={0}
        learned={false}
        flipped={false}
        skipFlipAnimation={false}
        onFlip={onFlip}
        onSpeak={onSpeak}
        onToggleLearned={vi.fn()}
        onMarkLearned={onMarkLearned}
        onMarkUnlearned={vi.fn()}
        onPrevious={vi.fn()}
        onNext={vi.fn()}
        onRestart={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Lật flashcard" }));
    fireEvent.click(screen.getByRole("button", { name: "Phát âm 한국" }));
    fireEvent.click(screen.getByRole("button", { name: "✓ Đã thuộc" }));

    expect(onFlip).toHaveBeenCalledOnce();
    expect(onSpeak).toHaveBeenCalledOnce();
    expect(onMarkLearned).toHaveBeenCalledOnce();
    expect(
      screen.getByRole("button", { name: "Thẻ trước" }).hasAttribute("disabled"),
    ).toBe(true);
    expect(screen.getByRole("button", { name: "Thẻ sau" })).toBeTruthy();
    expect(screen.queryByText("Lưu vào bộ từ")).toBeNull();
  });
});

describe("ModeNavigation", () => {
  it("thông báo đúng chế độ được chọn", () => {
    const onChange = vi.fn();
    render(
      <ModeNavigation
        activeMode="flashcard"
        availableModes={[
          "flashcard",
          "quiz",
          "typing",
          "matching",
          "dictation",
          "translation",
        ]}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Trắc nghiệm/ }));

    expect(onChange).toHaveBeenCalledWith("quiz");
    expect(
      screen.getByRole("button", { name: /Flashcard/ }).getAttribute(
        "aria-pressed",
      ),
    ).toBe("true");
  });
});

describe("QuizExercise", () => {
  it("gửi đáp án và khóa lựa chọn sau khi đã trả lời", () => {
    const onAnswer = vi.fn();
    const { rerender } = render(
      <QuizExercise
        word={["한국", "Hàn Quốc", "Quốc gia"]}
        options={["Hàn Quốc", "Việt Nam", "Nhật Bản", "Mỹ"]}
        selectedAnswer={null}
        score="0/0"
        isLastQuestion={false}
        onAnswer={onAnswer}
        onNext={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Hàn Quốc" }));
    expect(onAnswer).toHaveBeenCalledWith("Hàn Quốc");

    rerender(
      <QuizExercise
        word={["한국", "Hàn Quốc", "Quốc gia"]}
        options={["Hàn Quốc", "Việt Nam", "Nhật Bản", "Mỹ"]}
        selectedAnswer="Hàn Quốc"
        score="1/1"
        isLastQuestion={false}
        onAnswer={onAnswer}
        onNext={vi.fn()}
      />,
    );

    expect(screen.getByText("Chính xác!")).toBeTruthy();
    expect(
      screen
        .getAllByRole("button")
        .filter((button) => button.textContent !== "Câu tiếp theo →")
        .every((button) => button.hasAttribute("disabled")),
    ).toBe(true);
  });

  it("không hiển thị nút tiếp theo ở câu cuối", () => {
    render(
      <QuizExercise
        word={["한국", "Hàn Quốc", "Quốc gia"]}
        options={["Hàn Quốc", "Việt Nam"]}
        selectedAnswer="Việt Nam"
        score="0/1"
        isLastQuestion
        onAnswer={vi.fn()}
        onNext={vi.fn()}
      />,
    );

    expect(screen.queryByText("Câu tiếp theo →")).toBeNull();
    expect(screen.getByText(/Đáp án đúng/)).toBeTruthy();
  });
});

describe("TypingExercise", () => {
  it("gửi nội dung nhập và kiểm tra bằng phím Enter", () => {
    const onChange = vi.fn();
    const onCheck = vi.fn();
    render(
      <TypingExercise
        word={["한국", "Hàn Quốc", "Quốc gia"]}
        value=""
        checked={false}
        onChange={onChange}
        onCheck={onCheck}
        onNext={vi.fn()}
      />,
    );

    const input = screen.getByPlaceholderText("Nhập tiếng Hàn…");
    fireEvent.change(input, { target: { value: "한국" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onChange).toHaveBeenCalledWith("한국");
    expect(onCheck).toHaveBeenCalledOnce();
  });
});

describe("MatchingExercise", () => {
  it("yêu cầu chọn từ Hàn trước khi chọn nghĩa", () => {
    const onSelectKorean = vi.fn();
    const onSelectMeaning = vi.fn();
    render(
      <MatchingExercise
        items={[
          ["한국", "Hàn Quốc", "Quốc gia"],
          ["베트남", "Việt Nam", "Quốc gia"],
        ]}
        meanings={["Việt Nam", "Hàn Quốc"]}
        startIndex={0}
        selectedIndex={null}
        matchedIndices={[]}
        feedback={null}
        reviewMode={false}
        isLastGroup={false}
        onSelectKorean={onSelectKorean}
        onSelectMeaning={onSelectMeaning}
        onNextGroup={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "한국" }));
    fireEvent.click(screen.getByRole("button", { name: "Hàn Quốc" }));

    expect(onSelectKorean).toHaveBeenCalledWith(0);
    expect(onSelectMeaning).toHaveBeenCalledWith("Hàn Quốc");
  });

  it("hiển thị đáp án đúng ngay sau khi nối sai", () => {
    render(
      <MatchingExercise
        items={[
          ["한국", "Hàn Quốc", "Quốc gia"],
          ["베트남", "Việt Nam", "Quốc gia"],
        ]}
        meanings={["Việt Nam", "Hàn Quốc"]}
        startIndex={0}
        selectedIndex={null}
        matchedIndices={[]}
        feedback={{
          selectedWord: "한국",
          chosenMeaning: "Việt Nam",
          correctMeaning: "Hàn Quốc",
          correct: false,
        }}
        reviewMode={false}
        isLastGroup={false}
        onSelectKorean={vi.fn()}
        onSelectMeaning={vi.fn()}
        onNextGroup={vi.fn()}
      />,
    );

    expect(screen.getByText("Chưa đúng, thử lại nhé.")).toBeTruthy();
    expect(screen.getByText(/có nghĩa đúng là/).textContent).toContain(
      "Hàn Quốc",
    );
  });

  it("gắn nhãn rõ ràng khi đang ôn lại câu sai", () => {
    render(
      <MatchingExercise
        items={[["한국", "Hàn Quốc", "Quốc gia"]]}
        meanings={["Hàn Quốc"]}
        startIndex={0}
        selectedIndex={null}
        matchedIndices={[]}
        feedback={null}
        reviewMode
        isLastGroup
        onSelectKorean={vi.fn()}
        onSelectMeaning={vi.fn()}
        onNextGroup={vi.fn()}
      />,
    );

    expect(screen.getByText(/Ôn lại câu sai/)).toBeTruthy();
  });
});

describe("DictationExercise", () => {
  it("cho nghe, mở từng gợi ý và kiểm tra", () => {
    const onListen = vi.fn();
    const onHint = vi.fn();
    const onCheck = vi.fn();
    render(
      <DictationExercise
        sentence="저는 베트남 사람입니다."
        position={0}
        total={15}
        value=""
        checked={false}
        correct={false}
        visibleHintWords={0}
        onChange={vi.fn()}
        onListen={onListen}
        onHint={onHint}
        onCheck={onCheck}
        onRetry={vi.fn()}
        onNext={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "🔊 Nghe câu" }));
    fireEvent.click(screen.getByRole("button", { name: /Gợi ý \(0\/3\)/ }));
    fireEvent.click(screen.getByRole("button", { name: "Kiểm tra" }));

    expect(onListen).toHaveBeenCalledOnce();
    expect(onHint).toHaveBeenCalledOnce();
    expect(onCheck).not.toHaveBeenCalled();
    expect(screen.queryByText("저는 베트남 사람입니다.")).toBeNull();
  });

  it("chỉ mở tối đa 3 gợi ý và cho làm lại hoặc sang câu", () => {
    const onHint = vi.fn();
    const onRetry = vi.fn();
    const onNext = vi.fn();

    render(
      <DictationExercise
        sentence="저는 베트남 사람입니다. 학생입니다."
        position={0}
        total={2}
        value="저는 베트남"
        checked
        correct={false}
        visibleHintWords={3}
        onChange={vi.fn()}
        onListen={vi.fn()}
        onHint={onHint}
        onCheck={vi.fn()}
        onRetry={onRetry}
        onNext={onNext}
      />,
    );

    const hintButton = screen.getByRole("button", { name: /Gợi ý \(3\/3\)/ });
    expect(hintButton.hasAttribute("disabled")).toBe(true);
    expect(screen.getByText("저는 베트남 사람입니다.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /↻ Làm lại câu này/ }));
    fireEvent.click(screen.getByRole("button", { name: "Câu tiếp theo →" }));

    expect(onRetry).toHaveBeenCalledOnce();
    expect(onNext).toHaveBeenCalledOnce();
  });
});

describe("TranslationExercise", () => {
  it("đổi hướng dịch và hiển thị đáp án khi đã kiểm tra", () => {
    const onDirectionChange = vi.fn();
    render(
      <TranslationExercise
        pair={["Tôi là người Việt Nam.", "저는 베트남 사람입니다."]}
        position={0}
        total={15}
        direction="vi-ko"
        value="저는 베트남 사람입니다."
        checked
        correct
        directionNotice=""
        onDirectionChange={onDirectionChange}
        onChange={vi.fn()}
        onCheck={vi.fn()}
        onNext={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Tiếp tục: Hàn → Việt/ }),
    );

    expect(onDirectionChange).toHaveBeenCalledOnce();
    expect(screen.getByText(/Chính xác/)).toBeTruthy();
    expect(screen.queryByText("Câu tiếp theo →")).toBeNull();
  });

  it("hiển thị lời nhắc nhỏ khi chưa hoàn thành bước Việt sang Hàn", () => {
    render(
      <TranslationExercise
        pair={["Tôi là người Việt Nam.", "저는 베트남 사람입니다."]}
        position={0}
        total={15}
        direction="vi-ko"
        value=""
        checked={false}
        correct={false}
        directionNotice="Hãy nhập câu tiếng Hàn và bấm “Kiểm tra” trước khi sang bước dịch tiếng Việt."
        onDirectionChange={vi.fn()}
        onChange={vi.fn()}
        onCheck={vi.fn()}
        onNext={vi.fn()}
      />,
    );

    expect(screen.getByRole("status").textContent).toContain(
      "Hãy nhập câu tiếng Hàn",
    );
    expect(screen.getByText(/Bước 1\/2/)).toBeTruthy();
  });

  it("chỉ mở câu tiếp theo ở bước Hàn sang Việt", () => {
    render(
      <TranslationExercise
        pair={["Tôi là người Việt Nam.", "저는 베트남 사람입니다."]}
        position={0}
        total={15}
        direction="ko-vi"
        value="Tôi là người Việt Nam."
        checked
        correct
        directionNotice=""
        onDirectionChange={vi.fn()}
        onChange={vi.fn()}
        onCheck={vi.fn()}
        onNext={vi.fn()}
      />,
    );

    expect(screen.getByText("Câu tiếp theo →")).toBeTruthy();
    expect(screen.getByText(/Bước 2\/2/)).toBeTruthy();
  });
});
