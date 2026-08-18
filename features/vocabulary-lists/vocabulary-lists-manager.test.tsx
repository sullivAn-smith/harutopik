// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
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
      itemCount: 2,
      items: [
        {
          vocabularyId: "exam-highlight-highlight-1",
          lessonId: "exam:exam-1",
          item,
          createdAt: "2026-08-05T00:00:00.000Z",
        },
        {
          vocabularyId: "vocabulary-america",
          lessonId: "lesson-countries",
          item: {
            id: "vocabulary-america",
            korean: "미국",
            vietnamese: "Mỹ",
            romanization: "mi-guk",
            category: "Quốc gia",
            partOfSpeech: "Danh từ",
            examples: [],
          },
          createdAt: "2026-08-05T00:00:00.000Z",
        },
      ],
    },
  ],
};

describe("VocabularyListsManager", () => {
  it("cho learner thêm từ custom chỉ với hai trường bắt buộc", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockImplementation(
      async (input, init) => {
        if (
          String(input).endsWith("/custom-items") &&
          init?.method === "POST"
        ) {
          return new Response(
            JSON.stringify({
              data: {
                vocabularyId: "custom-new-word",
                lessonId: "custom",
                item: {
                  id: "custom-new-word",
                  korean: "약속",
                  vietnamese: "lời hứa",
                  romanization: "—",
                  category: "Từ cá nhân",
                  examples: [],
                },
                createdAt: "2026-08-17T00:00:00.000Z",
              },
            }),
            { status: 201, headers: { "content-type": "application/json" } },
          );
        }
        return new Response(JSON.stringify(listResponse), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    );

    render(<VocabularyListsManager backHref="/" />);
    fireEvent.click(
      await screen.findByRole("button", { name: "+ Thêm từ" }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "Thêm từ của riêng bạn",
    });
    expect(within(dialog).getByText("0/50 từ custom")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Speed Test/ })).toBeNull();
    fireEvent.change(screen.getByLabelText(/Tiếng Hàn/), {
      target: { value: "약속" },
    });
    fireEvent.change(screen.getByLabelText(/Nghĩa tiếng Việt/), {
      target: { value: "lời hứa" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Thêm vào bộ từ" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/vocabulary-lists/list-1/custom-items",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    const createCall = fetchMock.mock.calls.find(
      ([input, init]) =>
        String(input).endsWith("/custom-items") && init?.method === "POST",
    );
    expect(JSON.parse(String(createCall?.[1]?.body))).toEqual({
      korean: "약속",
      vietnamese: "lời hứa",
      romanization: "",
      partOfSpeech: "",
      example: "",
      category: "",
    });
  });

  it("khóa chức năng tạo khi tài khoản đã có 50 từ custom", async () => {
    const customItems = Array.from({ length: 50 }, (_, index) => ({
      vocabularyId: `custom-${index}`,
      lessonId: "custom",
      item: {
        id: `custom-${index}`,
        korean: `단어${index}`,
        vietnamese: `nghĩa ${index}`,
        romanization: "—",
        category: "Từ cá nhân",
        examples: [],
      },
      createdAt: "2026-08-17T00:00:00.000Z",
    }));
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              id: "list-1",
              name: "Từ custom",
              kind: "custom",
              itemCount: customItems.length,
              items: customItems,
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    render(<VocabularyListsManager backHref="/" />);
    const createButton = await screen.findByRole("button", {
      name: "+ Thêm từ",
    });
    expect(createButton.hasAttribute("disabled")).toBe(false);
    fireEvent.click(createButton);

    const dialog = screen.getByRole("dialog", {
      name: "Thêm từ của riêng bạn",
    });
    expect(within(dialog).getByText("50/50 từ custom")).toBeTruthy();
    expect(
      within(dialog)
        .getByRole("button", { name: "Thêm vào bộ từ" })
        .hasAttribute("disabled"),
    ).toBe(true);
  });

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

  it("lọc từ trong bộ theo tiếng Hàn, nghĩa và phiên âm", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify(listResponse), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));
    render(<VocabularyListsManager backHref="/" />);

    const search = await screen.findByRole("searchbox", { name: /Tìm từ trong bộ/ });
    fireEvent.change(search, { target: { value: "mi-guk" } });

    expect(screen.getByRole("button", { name: "Bỏ từ 미국" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Bỏ từ 안녕하세요" })).toBeNull();
    expect(screen.getByText("1 kết quả")).toBeTruthy();
    expect(screen.getAllByText("2 từ").length).toBeGreaterThan(0);
  });
});
