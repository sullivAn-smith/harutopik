// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  appendHangul,
  appendVietnameseTelex,
  FloatingLanguageKeyboard,
} from "./floating-language-keyboard";

beforeEach(() => window.localStorage.clear());
afterEach(cleanup);

describe("FloatingLanguageKeyboard", () => {
  it("ghép các jamo thành âm tiết Hangul", () => {
    let value = "";
    for (const character of ["ㅎ", "ㅏ", "ㄴ", "ㄱ", "ㅜ", "ㄱ"]) {
      value = appendHangul(value, character);
    }
    expect(value).toBe("한국");
  });

  it("mở bàn phím, đổi ngôn ngữ và làm sáng phím vật lý", () => {
    render(<FloatingLanguageKeyboard />);
    fireEvent.click(screen.getByRole("button", { name: "Mở bàn phím Hàn Việt" }));
    expect(screen.getByRole("button", { name: "한국어" })).toBeTruthy();

    fireEvent.keyDown(window, { code: "KeyQ", key: "q" });
    expect(screen.getByRole("button", { name: "ㅂ" }).className).toContain("bg-cyan-400");
    fireEvent.keyUp(window, { code: "KeyQ", key: "q" });
    expect(screen.getByRole("button", { name: "ㅂ" }).className).not.toContain("bg-cyan-400");

    fireEvent.click(screen.getByRole("button", { name: "Tiếng Việt" }));
    expect(screen.queryByRole("button", { name: "ă" })).toBeNull();
    expect(screen.getByRole("button", { name: "Tùy chỉnh kích thước bàn phím" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Xóa ký tự" })).toBeTruthy();
  });

  it("gõ tiếng Việt theo kiểu Telex", () => {
    let value = "";
    for (const character of "tieengs") value = appendVietnameseTelex(value, character);
    expect(value).toBe("tiếng");
    expect(appendVietnameseTelex("d", "d")).toBe("đ");
    expect(appendVietnameseTelex("a", "w")).toBe("ă");
  });

  it("lưu kích thước và đóng bảng tùy chỉnh", () => {
    render(<FloatingLanguageKeyboard />);
    fireEvent.click(screen.getByRole("button", { name: "Mở bàn phím Hàn Việt" }));
    fireEvent.click(screen.getByRole("button", { name: "Tùy chỉnh kích thước bàn phím" }));

    fireEvent.change(screen.getByRole("slider", { name: /Chiều rộng/ }), {
      target: { value: "680" },
    });
    fireEvent.change(screen.getByRole("slider", { name: /Chiều cao phím/ }), {
      target: { value: "52" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lưu kích thước" }));

    expect(screen.queryByRole("button", { name: "Lưu kích thước" })).toBeNull();
    expect(JSON.parse(window.localStorage.getItem("harutopik:floating-keyboard-size:v1") ?? "{}")).toEqual({
      width: 680,
      keyHeight: 52,
    });
  });
});
