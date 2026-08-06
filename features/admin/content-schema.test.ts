import { describe, expect, it } from "vitest";
import {
  lessonDraftFormSchema,
  normalizeLessonId,
  parseDictationExercisesJson,
  parseGrammarExercisesJson,
  parseGrammarJson,
  parseTranslationExercisesJson,
  parseVocabularyIdsJson,
  parseVocabularyLines,
} from "./content-schema";

describe("normalizeLessonId", () => {
  it("bỏ số 0 ở đầu ID dạng số", () => {
    expect(normalizeLessonId("015")).toBe("15");
  });

  it("giữ nguyên ID có cấu trúc để không đổi định danh đã quy ước", () => {
    expect(normalizeLessonId("lesson-topik-2-015")).toBe(
      "lesson-topik-2-015",
    );
  });
});

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
      dictationsJson: "[]",
      translationsJson: "[]",
      grammarJson: "[]",
      exercisesJson: "[]",
      changeSummary: "",
    });

    expect(result.order).toBe(2);
    expect(result.slug).toBe("quoc-tich-va-nghe-nghiep");
  });

  it("chuẩn hóa ID và thứ tự 015 thành 15", () => {
    const result = lessonDraftFormSchema.parse({
      id: "015",
      slug: "bai-15",
      courseId: "course-topik-2",
      moduleId: "module-topik-2",
      order: "015",
      titleVi: "Bài số 15",
      titleKo: "십오과",
      summary: "Nội dung bài học số mười lăm.",
      objectives: "Hoàn thành bài học.",
      vocabulary: "",
      vocabularyIdsJson: "[]",
      dictationsJson: "[]",
      translationsJson: "[]",
      grammarJson: "[]",
      exercisesJson: "[]",
      changeSummary: "",
    });

    expect(result.id).toBe("15");
    expect(result.order).toBe(15);
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
      dictationsJson: "[]",
      translationsJson: "[]",
      grammarJson: "[]",
      exercisesJson: "[]",
      changeSummary: "",
    });

    expect(result.success).toBe(false);
  });
});

describe("parseDictationExercisesJson", () => {
  it("tạo câu chính tả có ID ổn định và giữ URL audio Azure", () => {
    const [exercise] = parseDictationExercisesJson(
      JSON.stringify([
        {
          sentence: "저는 매일 한국어를 공부해요.",
          audioUrl: "https://cdn.example/dictation.mp3",
          acceptedAnswers: ["저는 매일 한국어 공부를 해요."],
        },
      ]),
      "lesson-topik-1-02",
    );

    expect(exercise).toMatchObject({
      id: "lesson-topik-1-02-dictation-001",
      type: "dictation",
      sentence: "저는 매일 한국어를 공부해요.",
      audioUrl: "https://cdn.example/dictation.mp3",
      acceptedAnswers: ["저는 매일 한국어 공부를 해요."],
      points: 1,
    });
  });

  it("từ chối câu chính tả đang để trống", () => {
    expect(() =>
      parseDictationExercisesJson(
        JSON.stringify([{ sentence: "" }]),
        "lesson-test",
      ),
    ).toThrow();
  });

  it("giới hạn tối đa 15 câu chính tả", () => {
    expect(() =>
      parseDictationExercisesJson(
        JSON.stringify(
          Array.from({ length: 16 }, (_, index) => ({
            sentence: `받아쓰기 문장 ${index + 1}`,
            acceptedAnswers: [],
          })),
        ),
        "lesson-test",
      ),
    ).toThrow();
  });
});

describe("parseTranslationExercisesJson", () => {
  it("tạo câu dịch hai chiều cùng các đáp án chấp nhận", () => {
    const [exercise] = parseTranslationExercisesJson(
      JSON.stringify([
        {
          vietnamese: "Tôi học tiếng Hàn mỗi ngày.",
          korean: "저는 매일 한국어를 공부해요.",
          acceptedVietnameseAnswers: ["Mỗi ngày tôi học tiếng Hàn."],
          acceptedKoreanAnswers: ["저는 매일 한국어 공부를 해요."],
        },
      ]),
      "lesson-topik-1-02",
    );

    expect(exercise).toMatchObject({
      id: "lesson-topik-1-02-translation-001",
      type: "translation",
      acceptedVietnameseAnswers: ["Mỗi ngày tôi học tiếng Hàn."],
      acceptedKoreanAnswers: ["저는 매일 한국어 공부를 해요."],
    });
  });

  it("giới hạn tối đa 15 câu dịch", () => {
    expect(() =>
      parseTranslationExercisesJson(
        JSON.stringify(
          Array.from({ length: 16 }, (_, index) => ({
            vietnamese: `Câu ${index + 1}`,
            korean: `문장 ${index + 1}`,
            acceptedVietnameseAnswers: [],
            acceptedKoreanAnswers: [],
          })),
        ),
        "lesson-test",
      ),
    ).toThrow();
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
          examples: [{
            korean: "저는 학생이에요.",
            vietnamese: "Tôi là học sinh.",
            audioUrl: "https://cdn.example/grammar-example.mp3",
          }],
        },
      ]),
      "lesson-topik-1-02",
    );
    expect(point.id).toBe("lesson-topik-1-02-grammar-001");
    expect(point.examples[0].id).toBe(
      "lesson-topik-1-02-grammar-001-example-001",
    );
    expect(point.examples[0].audioUrl).toBe(
      "https://cdn.example/grammar-example.mp3",
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

describe("parseGrammarExercisesJson", () => {
  it("tạo bài điền ngữ pháp với ID ổn định", () => {
    const [exercise] = parseGrammarExercisesJson(
      JSON.stringify([
        {
          prompt: "저는 학생___.",
          translation: "Tôi là học sinh.",
          acceptedAnswers: ["이에요", "입니다"],
        },
      ]),
      "lesson-topik-1-02",
    );

    expect(exercise).toMatchObject({
      id: "lesson-topik-1-02-grammar-exercise-001",
      type: "fill-blank",
      acceptedAnswers: ["이에요", "입니다"],
    });
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

describe("parseVocabularyIdsJson", () => {
  it("giữ thứ tự đã chọn và loại bỏ ID trùng", () => {
    expect(parseVocabularyIdsJson('["word-2","word-1","word-2"]')).toEqual([
      "word-2",
      "word-1",
    ]);
  });

  it("từ chối dữ liệu không phải danh sách ID", () => {
    expect(() => parseVocabularyIdsJson('{"id":"word-1"}')).toThrow();
  });
});
