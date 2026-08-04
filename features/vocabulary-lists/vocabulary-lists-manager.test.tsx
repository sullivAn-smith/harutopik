// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VocabularyListsManager } from "./vocabulary-lists-manager";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const item = {
  id: "exam-highlight-highlight-1",
  korean: "안녕하세요",
  vietnamese: "Từ cần ôn từ đề thi",
  romanization: "—",
  category: "Luyện đề",
  partOfSpeech: "Từ highlight",
  examples: [],
};

const listResponse = {
  data: [
    {
      id: "list-1",
      name: "Từ TOPIK cần ôn",
      kind: "custom",
      itemCount: 1,
      items: [
        {
          vocabularyId: "exam-highlight-highlight-1",
          lessonId: "exam:exam-1",
          item,
          createdAt: "2026-08-05T00:00:00.000Z",
        },
      ],
    },
  ],
};

describe("VocabularyListsManager", () => {
  it("cho learner bổ sung dữ liệu cho từ được tạo từ highlight", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockImplementation(
      async (input, init) => {
        if (init?.method === "PATCH") {
          return new Response(
            JSON.stringify({ data: { updated: true } }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        return new Response(JSON.stringify(listResponse), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    );

    render(<VocabularyListsManager backHref="/luyen-de" />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Bổ sung thông tin →" }),
    );

    fireEvent.change(screen.getByLabelText(/Nghĩa tiếng Việt/), {
      target: { value: "Xin chào" },
    });
    fireEvent.change(screen.getByLabelText(/Phiên âm/), {
      target: { value: "annyeonghaseyo" },
    });
    fireEvent.change(screen.getByLabelText("Từ loại"), {
      target: { value: "Biểu hiện" },
    });
    fireEvent.change(screen.getByLabelText(/Ví dụ tiếng Hàn/), {
      target: { value: "안녕하세요, 만나서 반갑습니다." },
    });
    fireEvent.change(screen.getByLabelText(/Chủ đề/), {
      target: { value: "Chào hỏi" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lưu từ cá nhân" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/vocabulary-lists/list-1/items/exam-highlight-highlight-1",
        expect.objectContaining({ method: "PATCH" }),
      ),
    );
    const patchCall = fetchMock.mock.calls.find(
      ([, init]) => init?.method === "PATCH",
    );
    expect(JSON.parse(String(patchCall?.[1]?.body))).toMatchObject({
      item: {
        korean: "안녕하세요",
        vietnamese: "Xin chào",
        romanization: "annyeonghaseyo",
        partOfSpeech: "Biểu hiện",
        category: "Chào hỏi",
        examples: [{ korean: "안녕하세요, 만나서 반갑습니다." }],
      },
    });
  });
});
