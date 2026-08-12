// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExamImageUpload } from "./exam-image-upload";

describe("ExamImageUpload", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("cho phép mở lại ảnh đã tải để chỉnh kích thước", () => {
    render(<ExamImageUpload examId="exam-1" value="https://cdn.example.com/reading.webp" onChange={vi.fn()} label="Tải ảnh đề lên" />);

    expect(screen.getByRole("button", { name: "Chỉnh ảnh hiện tại" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Xem trước ảnh" }));
    expect(screen.getByRole("dialog", { name: "Xem trước Tải ảnh đề lên" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Ảnh xem trước Tải ảnh đề lên" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Xem trước Tải ảnh đề lên" }).className).toContain("bg-slate-100");
  });

  it("cho phép lưu lại ảnh hiện tại ngay cả khi kích thước là 100%", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(["image"], { type: "image/webp" }) }));
    vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn(() => "blob:current-image"), revokeObjectURL: vi.fn() });
    render(<ExamImageUpload examId="exam-1" value="https://cdn.example.com/reading.webp" onChange={vi.fn()} label="Tải ảnh đề lên" />);

    fireEvent.click(screen.getByRole("button", { name: "Chỉnh ảnh hiện tại" }));

    expect((await screen.findByRole("button", { name: "Lưu ảnh ở 100%" }) as HTMLButtonElement).disabled).toBe(false);
  });
});
