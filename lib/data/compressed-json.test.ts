import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { compressJson, decompressJson } from "./compressed-json";

describe("compressed JSON cache payload", () => {
  it("round-trips Unicode lesson content without changing its structure", () => {
    const source = {
      title: { ko: "한국어", vi: "Tiếng Hàn" },
      vocabulary: Array.from({ length: 100 }, (_, index) => ({
        id: `word-${index}`,
        korean: "안녕하세요",
        vietnamese: "Xin chào",
      })),
    };
    const compressed = compressJson(source);

    expect(decompressJson(compressed)).toEqual(source);
    expect(Buffer.byteLength(compressed)).toBeLessThan(
      Buffer.byteLength(JSON.stringify(source)),
    );
  });
});
