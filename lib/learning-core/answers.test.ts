import { describe, expect, it } from "vitest";
import {
  calculatePercentage,
  isAcceptedAnswer,
  normalizeAnswer,
  uniqueIndices,
} from "./answers";

describe("normalizeAnswer", () => {
  it("bỏ khoảng trắng và dấu câu khi chấm đáp án tiếng Hàn", () => {
    expect(normalizeAnswer(" 저는 베트남 사람입니다. ")).toBe(
      "저는베트남사람입니다",
    );
  });

  it("chuẩn hóa Unicode trước khi so sánh", () => {
    expect(normalizeAnswer("Việt Nam")).toBe(
      normalizeAnswer("Việt Nam".normalize("NFC")),
    );
  });
});

describe("isAcceptedAnswer", () => {
  it("chấp nhận một trong nhiều cách trả lời hợp lệ", () => {
    expect(
      isAcceptedAnswer("vâng!", ["vâng", "dạ"], {
        ignoreWhitespace: false,
      }),
    ).toBe(true);
  });

  it("không chấp nhận đáp án khác nghĩa", () => {
    expect(isAcceptedAnswer("는", ["은"])).toBe(false);
  });
});

describe("session helpers", () => {
  it("loại bỏ câu sai bị ghi trùng", () => {
    expect(uniqueIndices([1, 1, 3, 3, 5])).toEqual([1, 3, 5]);
  });

  it("tính phần trăm an toàn", () => {
    expect(calculatePercentage(8, 10)).toBe(80);
    expect(calculatePercentage(0, 0)).toBe(0);
  });
});
