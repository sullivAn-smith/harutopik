import { describe, expect, it } from "vitest";
import { parseCsv, parseExamImportRows } from "./exam-import";

const headers = ["section", "number", "instruction", "question", "option_1", "option_2", "option_3", "option_4", "correct_option", "explanation", "audio_text", "image_url"];

describe("parseExamImportRows", () => {
  it("đọc được cả câu nghe và câu đọc", () => {
    const result = parseExamImportRows([
      headers,
      ["listening", 1, "Nghe", "", "1", "2", "3", "4", 1, "", "안녕", ""],
      ["reading", 1, "Đọc", "문제", "1", "2", "3", "4", 2, "", "", "https://cdn.example.com/q.png"],
    ]);
    expect(result.map((question) => question.section)).toEqual(["listening", "reading"]);
    expect(result[1].imageUrl).toBe("https://cdn.example.com/q.png");
  });

  it("từ chối section không hợp lệ", () => {
    expect(() => parseExamImportRows([headers, ["writing", 1, "", "", "1", "2", "3", "4", 1, "", "", ""]])).toThrow("section");
  });
});

describe("parseCsv", () => {
  it("giữ dấu phẩy nằm trong ô được trích dẫn", () => {
    expect(parseCsv('section,question\nreading,"안녕, 하세요"')[1]).toEqual(["reading", "안녕, 하세요"]);
  });
});
