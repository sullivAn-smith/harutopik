// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { GrammarExerciseImport } from "./grammar-exercise-import";

afterEach(cleanup);

describe("GrammarExerciseImport", () => {
  it("cho biên tập viên tạo câu luyện tập thủ công", () => {
    const onChange = vi.fn();
    render(<GrammarExerciseImport exercises={[]} onChange={onChange} />);

    expect(screen.queryByText(/Nhập CSV/)).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "+ Thêm câu luyện tập" }),
    );

    expect(onChange).toHaveBeenCalledWith([
      { prompt: "", translation: "", acceptedAnswers: [""] },
    ]);
  });

  it("cập nhật riêng từng field của câu", () => {
    const onChange = vi.fn();
    render(
      <GrammarExerciseImport
        exercises={[
          {
            prompt: "저는 학생___.",
            translation: "Tôi là học sinh.",
            acceptedAnswers: ["입니다"],
          },
        ]}
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("입니다 | 이에요"), {
      target: { value: "입니다 | 이에요" },
    });

    expect(onChange).toHaveBeenLastCalledWith([
      {
        prompt: "저는 학생___.",
        translation: "Tôi là học sinh.",
        acceptedAnswers: ["입니다", "이에요"],
      },
    ]);
  });
});
