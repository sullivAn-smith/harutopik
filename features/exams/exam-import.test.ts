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

  it("dùng chung đoạn đọc và ảnh cho nhóm nhiều câu", () => {
    const readingHeaders = [
      ...headers,
      "reading_type",
      "passage_group",
      "passage",
    ];
    const result = parseExamImportRows([
      readingHeaders,
      [
        "reading", 31, "Đọc đoạn văn", "Ý chính là gì?", "1", "2", "3", "4", 2,
        "", "", "https://cdn.example.com/passage.png", "long_passage", "reading-31-32", "Đây là đoạn văn dùng chung.",
      ],
      [
        "reading", 32, "Đọc đoạn văn", "Thông tin nào đúng?", "1", "2", "3", "4", 3,
        "", "", "", "long_passage", "reading-31-32", "",
      ],
    ]);

    expect(result[1]).toMatchObject({
      readingType: "long_passage",
      passageBlockKey: "reading-31-32",
      passage: "Đây là đoạn văn dùng chung.",
      imageUrl: "https://cdn.example.com/passage.png",
    });
  });

  it("báo rõ loại câu đọc không hợp lệ", () => {
    const readingHeaders = [...headers, "reading_type"];
    expect(() => parseExamImportRows([
      readingHeaders,
      ["reading", 1, "", "문제", "1", "2", "3", "4", 1, "", "", "", "unknown_type"],
    ])).toThrow("reading_type không hợp lệ");
  });

  it("đọc được workbook có phần hướng dẫn phía trên dòng tiêu đề", () => {
    const result = parseExamImportRows([
      ["TOPIK I · MẪU NHẬP ĐỀ HARUTOPIK"],
      ["Chỉ điền ô màu trắng."],
      [],
      headers,
      ["reading", 1, "", "문제", "1", "2", "3", "4", 2, "", "", ""],
    ]);
    expect(result[0]).toMatchObject({ section: "reading", position: 1, correctOption: 2 });
  });

  it("coi ô đánh dấu KHÓA là ô trống", () => {
    const result = parseExamImportRows([
      headers,
      ["listening", 1, "🔒 KHÓA", "🔒 KHÓA", "1", "2", "3", "4", 1, "", "", ""],
    ]);
    expect(result[0]).toMatchObject({ instruction: "", prompt: "" });
  });
});

describe("parseCsv", () => {
  it("giữ dấu phẩy nằm trong ô được trích dẫn", () => {
    expect(parseCsv('section,question\nreading,"안녕, 하세요"')[1]).toEqual(["reading", "안녕, 하세요"]);
  });
});
