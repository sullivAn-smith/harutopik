import { describe, expect, it } from "vitest";
import {
  lessonDraftFormSchema,
  parseGrammarJson,
  parseVocabularyLines,
} from "./content-schema";

describe("lessonDraftFormSchema", () => {
  it("chuẩn hóa dữ liệu form CMS hợp lệ", () => {
    const result = lessonDraftFormSchema.parse({
      id: "lesson-topik-1-02",
      slug: "quoc-tich-va-nghe-nghiep",
      courseId: "course-topik-1",
      moduleId: "module-topik-1-foundation",
      order: "2",
      titleVi: "Quốc tịch và nghề nghiệp",
      titleKo: "국적과 직업",
      summary: "Học cách giới thiệu quốc tịch và nghề nghiệp.",
      objectives: "Nhận biết quốc gia",
      vocabulary: "",
      grammarJson: "[]",
      changeSummary: "",
    });

    expect(result.order).toBe(2);
    expect(result.slug).toBe("quoc-tich-va-nghe-nghiep");
  });

  it("từ chối slug có chữ hoa hoặc dấu cách", () => {
    const result = lessonDraftFormSchema.safeParse({
      id: "Lesson 02",
      slug: "Bài mới",
      courseId: "course-topik-1",
      moduleId: "module-topik-1-foundation",
      order: 2,
      titleVi: "Bài mới",
      titleKo: "새 수업",
      summary: "Mô tả bài học mới có đủ độ dài.",
      objectives: "Mục tiêu",
      vocabulary: "",
      grammarJson: "[]",
      changeSummary: "",
    });

    expect(result.success).toBe(false);
  });
});

describe("parseGrammarJson", () => {
  it("tạo ID ổn định cho điểm ngữ pháp và ví dụ", () => {
    const [point] = parseGrammarJson(
      JSON.stringify([
        {
          title: "Tiểu từ chủ đề",
          form: "은/는",
          explanation: "Dùng để nêu chủ đề của câu.",
          formula: "Danh từ + 은/는",
          examples: [{ korean: "저는 학생이에요.", vietnamese: "Tôi là học sinh." }],
        },
      ]),
      "lesson-topik-1-02",
    );
    expect(point.id).toBe("lesson-topik-1-02-grammar-001");
    expect(point.examples[0].id).toBe(
      "lesson-topik-1-02-grammar-001-example-001",
    );
  });

  it("từ chối điểm ngữ pháp không có ví dụ hoàn chỉnh", () => {
    expect(() =>
      parseGrammarJson(
        JSON.stringify([
          {
            title: "Tiểu từ",
            form: "은/는",
            explanation: "Giải thích",
            formula: "N + 은/는",
            examples: [],
          },
        ]),
        "lesson-test",
      ),
    ).toThrow();
  });
});

describe("parseVocabularyLines", () => {
  it("chuyển từng dòng thành vocabulary item có ID ổn định", () => {
    const items = parseVocabularyLines(
      "한국 | Hàn Quốc | han-guk | Quốc gia | Danh từ",
      "lesson-topik-1-02",
    );

    expect(items[0]).toMatchObject({
      id: "lesson-topik-1-02-vocabulary-001",
      korean: "한국",
      vietnamese: "Hàn Quốc",
      romanization: "han-guk",
      category: "Quốc gia",
      partOfSpeech: "Danh từ",
    });
  });

  it("báo chính xác dòng thiếu trường bắt buộc", () => {
    expect(() =>
      parseVocabularyLines("한국 | Hàn Quốc", "lesson-topik-1-02"),
    ).toThrow("Dòng từ vựng 1");
  });
});
