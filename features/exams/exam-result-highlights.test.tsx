// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExamResultHighlights } from "./exam-result-highlights";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ExamResultHighlights", () => {
  it("cho lưu một highlight còn sót vào đúng bộ từ sau khi đã nộp bài", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockImplementation(
      async (input, init) => {
        const url = String(input);
        if (url === "/api/v1/vocabulary-lists") {
          return new Response(
            JSON.stringify({
              data: [
                {
                  id: "00000000-0000-4000-8000-000000000088",
                  name: "Từ TOPIK cần ôn",
                  kind: "custom",
                  itemCount: 3,
                },
              ],
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        if (url.endsWith("/review") && init?.method === "POST") {
          return new Response(
            JSON.stringify({
              data: {
                listId: "00000000-0000-4000-8000-000000000088",
                listName: "Từ TOPIK cần ôn",
              },
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        return new Response(JSON.stringify({ error: { message: "Unexpected" } }), {
          status: 500,
          headers: { "content-type": "application/json" },
        });
      },
    );

    render(
      <ExamResultHighlights
        attemptId="00000000-0000-4000-8000-000000000010"
        initialHighlights={[
          {
            id: "00000000-0000-4000-8000-000000000099",
            selectedText: "안녕하세요",
            color: "yellow",
            reviewListId: null,
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "＋ Lưu" }));
    fireEvent.click(
      await screen.findByRole("button", { name: /Từ TOPIK cần ôn/ }),
    );

    await waitFor(() =>
      expect(screen.getByText("1 từ highlight · 1 từ đã lưu")).toBeTruthy(),
    );
    expect(screen.getByText("✓ Đã lưu")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/exam-attempts/00000000-0000-4000-8000-000000000010/highlights/00000000-0000-4000-8000-000000000099/review",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
