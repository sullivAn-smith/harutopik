// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VocabularyLibrary } from "./vocabulary-library";

vi.mock("./actions", () => ({
  deleteVocabularyDrafts: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const items = [
  {
    id: "traffic-owned-1",
    hangul: "신호등",
    romanization: "sin-ho-deung",
    meaningVi: "Đèn tín hiệu giao thông",
    partOfSpeech: "Danh từ",
    level: "beginner",
    category: "Giao thông",
    audioUrl: null,
    imageUrl: null,
    status: "draft",
    createdBy: "editor-1",
    canDelete: true,
  },
  {
    id: "traffic-owned-2",
    hangul: "지하도",
    romanization: "ji-ha-do",
    meaningVi: "Đường hầm",
    partOfSpeech: "Danh từ",
    level: "beginner",
    category: "Giao thông",
    audioUrl: null,
    imageUrl: null,
    status: "changes_requested",
    createdBy: "editor-1",
    canDelete: true,
  },
  {
    id: "traffic-published",
    hangul: "버스",
    romanization: "beo-seu",
    meaningVi: "Xe buýt",
    partOfSpeech: "Danh từ",
    level: "beginner",
    category: "Giao thông",
    audioUrl: "https://cdn.example.com/bus.mp3",
    imageUrl: null,
    status: "published",
    createdBy: "editor-1",
    canDelete: false,
  },
  {
    id: "animal-owned",
    hangul: "사자",
    romanization: "sa-ja",
    meaningVi: "Sư tử",
    partOfSpeech: "Danh từ",
    level: "beginner",
    category: "Động vật",
    audioUrl: null,
    imageUrl: null,
    status: "draft",
    createdBy: "editor-1",
    canDelete: true,
  },
];

const hiddenTrafficDrafts = Array.from({ length: 31 }, (_, index) => ({
  ...items[0],
  id: `traffic-hidden-${index + 1}`,
  hangul: `숨김${index + 1}`,
}));

describe("VocabularyLibrary bulk deletion", () => {
  it("chọn tất cả chỉ lấy các từ có quyền xóa trong chủ đề đang lọc", () => {
    const { container } = render(
      <VocabularyLibrary items={[...items, ...hiddenTrafficDrafts]} />,
    );

    fireEvent.change(screen.getByRole("combobox", { name: "Lọc theo chủ đề" }), {
      target: { value: "Giao thông" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Chọn tất cả 33 từ có thể xóa" }),
    );

    expect(screen.getByText("Đã chọn 33 từ")).toBeTruthy();
    const selectedIds = JSON.parse(
      container.querySelector<HTMLInputElement>(
        'input[name="vocabularyIdsJson"]',
      )?.value ?? "[]",
    );
    expect(selectedIds).toHaveLength(33);
    expect(selectedIds).toContain("traffic-hidden-31");
    expect(selectedIds).not.toContain("traffic-published");
    expect(
      screen.queryByRole("checkbox", { name: "Chọn từ 버스" }),
    ).toBeNull();
  });

  it("cho chọn từng từ và xóa lựa chọn khi đổi bộ lọc", () => {
    const { container } = render(<VocabularyLibrary items={items} />);

    fireEvent.click(
      screen.getByRole("checkbox", { name: "Chọn từ 신호등" }),
    );
    expect(screen.getByText("Đã chọn 1 từ")).toBeTruthy();

    fireEvent.change(screen.getByRole("combobox", { name: "Lọc theo chủ đề" }), {
      target: { value: "Động vật" },
    });

    expect(screen.getByText("Đã chọn 0 từ")).toBeTruthy();
    expect(
      container.querySelector<HTMLInputElement>(
        'input[name="vocabularyIdsJson"]',
      )?.value,
    ).toBe("[]");
  });
});
