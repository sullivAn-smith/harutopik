// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { VocabularyItem } from "@/content/schema";
import { CardReactionExperience } from "./card-reaction-experience";

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
  vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.restoreAllMocks();
});
const vocabulary = Array.from({ length: 25 }, (_, index): VocabularyItem => ({ id: `word-${index}`, korean: `단어${index}`, vietnamese: `nghĩa ${index}`, romanization: `word-${index}`, category: "general", partOfSpeech: "noun", examples: [] }));
const props = { vocabulary, lessonName: "Bài 1", lessonId: "lesson-1", courseSlug: "topik-1", lessonSlug: "bai-1", progressById: {}, backHref: "/lesson" };

describe("CardReactionExperience", () => {
  it("có đủ level, direction và answer type", () => {
    render(<CardReactionExperience {...props} />);
    expect(screen.getByRole("button", { name: /^Dễ/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Vừa/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Khó/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Hàn → Việt" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Việt → Hàn" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "🔀 Trộn hai chiều" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Trắc nghiệm/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "⌨️ Gõ đáp án" })).toBeTruthy();
  });

  it("tô màu toàn bộ button theo level được chọn", () => {
    render(<CardReactionExperience {...props} />);
    const easy = screen.getByRole("button", { name: /^Dễ/ });
    const medium = screen.getByRole("button", { name: /^Vừa/ });
    const hard = screen.getByRole("button", { name: /^Khó/ });

    expect(medium.className).toContain("bg-amber-400");

    fireEvent.click(easy);
    expect(easy.className).toContain("bg-emerald-500");
    expect(medium.className).toContain("bg-white");

    fireEvent.click(hard);
    expect(hard.className).toContain("bg-rose-500");
    expect(easy.className).toContain("bg-white");
  });

  it("khóa level khi lesson không đủ từ", () => {
    render(<CardReactionExperience {...props} vocabulary={vocabulary.slice(0, 10)} />);
    expect(screen.getByRole("button", { name: /^Vừa/ }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: /^Khó/ }).hasAttribute("disabled")).toBe(true);
  });

  it("bắt đầu trực tiếp từ màn thiết lập", () => {
    render(<CardReactionExperience {...props} />);
    fireEvent.click(screen.getByRole("button", { name: /BẮT ĐẦU/ }));
    expect(screen.getByText("Sẵn sàng dọn board?")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
  });
});
