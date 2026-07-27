import { describe, expect, it } from "vitest";
import {
  normalizeImportMatrix,
  parseCsv,
  vocabularyNaturalKey,
} from "./parser";

describe("vocabulary import parser", () => {
  it("parses quoted CSV cells and escaped quotes", () => {
    expect(parseCsv('hangul,meaning_vi\n안녕,"Xin chào, ""bạn"""\n')).toEqual([
      ["hangul", "meaning_vi"],
      ["안녕", 'Xin chào, "bạn"'],
    ]);
  });

  it("normalizes defaults, answers and examples", () => {
    const [row] = normalizeImportMatrix([
      [
        "hangul",
        "meaning_vi",
        "accepted_vi",
        "accepted_ko",
        "example_ko",
        "example_vi",
      ],
      [" 안녕 ", " Xin chào ", "Chào bạn|Xin chào", "안녕| 안녕 ", "안녕!", "Chào!"],
    ]);
    expect(row.normalizedData.category).toBe("general");
    expect(row.normalizedData.accepted_vi).toEqual(["Xin chào", "Chào bạn"]);
    expect(row.normalizedData.accepted_ko).toEqual(["안녕"]);
    expect(row.normalizedData.examples).toEqual([
      { korean: "안녕!", vietnamese: "Chào!" },
    ]);
    expect(row.validationErrors).toEqual([]);
  });

  it("reports incomplete rows and invalid URLs", () => {
    const [row] = normalizeImportMatrix([
      ["hangul", "meaning_vi", "example_ko", "audio_url"],
      ["", "Cảm ơn", "감사합니다.", "not-a-url"],
    ]);
    expect(row.validationErrors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("hangul"),
        expect.stringContaining("đủ tiếng Hàn"),
        expect.stringContaining("audio_url"),
      ]),
    );
  });

  it("builds a stable normalized duplicate key", () => {
    expect(
      vocabularyNaturalKey({
        hangul: " 안녕 ",
        partOfSpeech: " Danh từ ",
        meaningVi: " XIN CHÀO! ",
      }),
    ).toBe("안녕|danh từ|xin chào");
  });
});
