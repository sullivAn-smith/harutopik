// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { VocabularyItem } from "@/content/schema";
import { AudioReactionExperience } from "./audio-reaction-experience";

afterEach(cleanup);

function vocabulary(count: number): VocabularyItem[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `word-${index + 1}`,
    korean: `단어${index + 1}`,
    vietnamese: `nghĩa ${index + 1}`,
    romanization: `word-${index + 1}`,
    category: "general",
    partOfSpeech: "noun",
    audioUrl: `/word-${index + 1}.mp3`,
    examples: [],
  }));
}

const baseProps = {
  lessonName: "Bài 1: Giới thiệu",
  lessonId: "lesson-1",
  courseSlug: "topik-1",
  lessonSlug: "bai-1",
  progressById: {},
  backHref: "/courses/topik-1/lessons/bai-1",
};

describe("AudioReactionExperience setup", () => {
  it("mặc định 10 câu Choose và khóa mốc vượt số audio trong lesson", () => {
    render(<AudioReactionExperience {...baseProps} vocabulary={vocabulary(12)} />);
    expect(screen.getByText("12 từ có audio khả dụng")).toBeTruthy();
    expect(screen.getByRole("button", { name: /10\s*câu/ }).hasAttribute("disabled")).toBe(false);
    expect(screen.getByRole("button", { name: /20\s*chưa đủ audio/ }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: /30\s*chưa đủ audio/ }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: /🎯 CHỌN/ }).className).toContain("border-amber-500");
  });

  it("cho phép chọn Type và chuyển sang countdown", () => {
    render(<AudioReactionExperience {...baseProps} vocabulary={vocabulary(10)} />);
    fireEvent.click(screen.getByRole("button", { name: /⌨️ GÕ/ }));
    fireEvent.click(screen.getByRole("button", { name: /BẮT ĐẦU/ }));
    expect(screen.getByText("Sẵn sàng?")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
  });

  it("không cho bắt đầu khi lesson chưa có đủ 10 audio", () => {
    render(<AudioReactionExperience {...baseProps} vocabulary={vocabulary(4)} />);
    expect(screen.getByRole("button", { name: /BẮT ĐẦU/ }).hasAttribute("disabled")).toBe(true);
  });

  it("không tính audio của câu ví dụ vào số câu khả dụng", () => {
    const items = vocabulary(10).map((item, index) => ({
      ...item,
      ...(index < 4 ? { audioUrl: undefined } : {}),
      examples: [{
        id: `example-${index}`,
        korean: `예문 ${index}`,
        vietnamese: `câu ví dụ ${index}`,
        audioUrl: `/example-${index}.mp3`,
      }],
    }));
    render(<AudioReactionExperience {...baseProps} vocabulary={items} />);
    expect(screen.getByText("6 từ có audio khả dụng")).toBeTruthy();
    expect(screen.getByText("6 từ đơn · Audio câu ví dụ không được sử dụng")).toBeTruthy();
    expect(screen.getByRole("button", { name: /BẮT ĐẦU/ }).hasAttribute("disabled")).toBe(true);
  });

  it("Flash Reaction không yêu cầu audio và cho đổi chiều phản xạ", () => {
    const items = vocabulary(10).map((item) => ({ ...item, audioUrl: undefined }));
    render(<AudioReactionExperience {...baseProps} vocabulary={items} gameType="flash_reaction" />);
    expect(screen.getByText("10 từ vựng khả dụng")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Việt → Hàn" }));
    expect(screen.getByRole("button", { name: "Việt → Hàn" }).className).toContain("border-amber-500");
    expect(screen.getByRole("button", { name: /BẮT ĐẦU/ }).hasAttribute("disabled")).toBe(false);
  });
});
