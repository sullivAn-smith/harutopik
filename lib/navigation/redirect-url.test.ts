import { describe, expect, it } from "vitest";
import { withErrorMessage } from "./redirect-url";

describe("withErrorMessage", () => {
  it("encodes Vietnamese messages so they are safe in redirect headers", () => {
    const target = withErrorMessage(
      "/bien-tap/de-thi/moi",
      "Thông tin đề chưa hợp lệ.",
    );

    expect(target).toBe(
      "/bien-tap/de-thi/moi?error=Th%C3%B4ng%20tin%20%C4%91%E1%BB%81%20ch%C6%B0a%20h%E1%BB%A3p%20l%E1%BB%87.",
    );
    expect(/[^\x00-\x7F]/.test(target)).toBe(false);
  });

  it("preserves an existing query string", () => {
    expect(withErrorMessage("/luyen-de?from=home", "Chưa sẵn sàng"))
      .toBe("/luyen-de?from=home&error=Ch%C6%B0a%20s%E1%BA%B5n%20s%C3%A0ng");
  });
});
