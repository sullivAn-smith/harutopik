import { describe, expect, it } from "vitest";
import { apiBackendError, apiError, apiSuccess } from "./responses";

describe("API responses", () => {
  it("trả envelope có version và request ID", async () => {
    const response = apiSuccess({ ok: true });
    const body = await response.json();
    expect(body.data.ok).toBe(true);
    expect(body.meta.apiVersion).toBe("1");
    expect(response.headers.get("x-request-id")).toBe(body.meta.requestId);
  });

  it("không làm lộ exception trong error envelope", async () => {
    const response = apiError("INVALID_INPUT", "Dữ liệu không hợp lệ.", 400);
    const body = await response.json();
    expect(body.error).toEqual({
      code: "INVALID_INPUT",
      message: "Dữ liệu không hợp lệ.",
    });
  });

  it("converts backend conflicts into a stable API error", async () => {
    const response = apiBackendError(
      { code: "23505", message: "duplicate key" },
      "Không thể lưu.",
    );
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "DUPLICATE",
        message: "ID, slug hoặc dữ liệu này đã tồn tại. Hãy dùng một giá trị khác.",
      },
    });
  });
});
