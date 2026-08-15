// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { VocabularyItem } from "@/content/schema";
import { CardReactionExperience } from "./card-reaction-experience";

afterEach(() => { cleanup(); window.localStorage.clear(); });
const vocabulary = Array.from({ length: 25 }, (_, index): VocabularyItem => ({ id: `word-${index}`, korean: `단어${index}`, vietnamese: `nghĩa ${index}`, romanization: `word-${index}`, category: "general", partOfSpeech: "noun", examples: [] }));
const props = { vocabulary, lessonName: "Bài 1", lessonId: "lesson-1", courseSlug: "topik-1", lessonSlug: "bai-1", progressById: {}, backHref: "/lesson" };

describe("CardReactionExperience", () => {
  it("có đủ level, direction và answer type", () => {
    render(<CardReactionExperience {...props} />);
    expect(screen.getByRole("button", { name: /🟢 Dễ/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /🟡 Vừa/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /🔴 Khó/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "🔀 Trộn hai chiều" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Trắc nghiệm/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "⌨️ Gõ đáp án" })).toBeTruthy();
  });

  it("khóa level khi lesson không đủ từ", () => {
    render(<CardReactionExperience {...props} vocabulary={vocabulary.slice(0, 10)} />);
    expect(screen.getByRole("button", { name: /🟡 Vừa/ }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: /🔴 Khó/ }).hasAttribute("disabled")).toBe(true);
  });

  it("bắt đầu trực tiếp từ màn thiết lập", () => {
    render(<CardReactionExperience {...props} />);
    fireEvent.click(screen.getByRole("button", { name: /BẮT ĐẦU/ }));
    expect(screen.getByText("Sẵn sàng dọn board?")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
  });
});
