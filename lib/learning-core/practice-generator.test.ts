import { describe, expect, it } from "vitest";
import type { Lesson, VocabularyItem } from "@/content/schema";
import {
  generateLessonPractice,
  seededShuffle,
} from "./practice-generator";

function word(index: number, input: Partial<VocabularyItem> = {}): VocabularyItem {
  return {
    id: `word-${index}`,
    korean: `단어${index}`,
    vietnamese: `Nghĩa ${index}`,
    romanization: `daneo-${index}`,
    category: "Chung",
    acceptedKoreanAnswers: [],
    acceptedVietnameseAnswers: [],
    examples: [],
    ...input,
  };
}

function lesson(vocabulary: VocabularyItem[]): Lesson {
  return {
    id: "lesson-generator",
    slug: "lesson-generator",
    courseId: "course-topik-1",
    moduleId: "module-topik-1-foundation",
    order: 1,
    version: 1,
    status: "published",
    title: { vi: "Generator", ko: "연습" },
    summary: "Bài học kiểm tra generator.",
    objectives: ["Kiểm tra"],
    vocabulary,
    grammar: [],
    exercises: [],
  };
}

describe("practice generator", () => {
  it("shuffle ổn định với cùng seed", () => {
    expect(seededShuffle([1, 2, 3, 4], "same")).toEqual(
      seededShuffle([1, 2, 3, 4], "same"),
    );
  });

  it("sinh quiz với 4 lựa chọn và đáp án đúng", () => {
    const bundle = generateLessonPractice(
      lesson([word(1), word(2), word(3), word(4)]),
    );
    expect(bundle.quiz).toHaveLength(4);
    expect(bundle.quiz[0].options).toHaveLength(4);
    expect(bundle.quiz[0].options).toContain(bundle.quiz[0].answer);
  });

  it("sinh dịch hai chiều từ accepted answers", () => {
    const bundle = generateLessonPractice(
      lesson([
        word(1, {
          acceptedVietnameseAnswers: ["Từ số một"],
          acceptedKoreanAnswers: ["단어 일"],
        }),
      ]),
    );
    expect(bundle.translations[0].acceptedVietnameseAnswers).toContain(
      "Từ số một",
    );
    expect(bundle.translations[0].acceptedKoreanAnswers).toContain("단어 일");
  });

  it("sinh chính tả cho mọi từ và dùng audio CDN khi có", () => {
    const bundle = generateLessonPractice(
      lesson([
        word(1),
        word(2, { audioUrl: "https://cdn.example/word-2.mp3" }),
      ]),
    );
    expect(bundle.dictations).toHaveLength(2);
    expect(bundle.dictations[0].audioUrl).toBeUndefined();
    expect(bundle.dictations.map((item) => item.vocabularyId)).toContain("word-2");
  });

  it("ưu tiên câu do biên tập soạn cho phần dịch và chính tả", () => {
    const input = lesson([word(1), word(2)]);
    input.exercises = [
      {
        id: "translation-sentence-1",
        type: "translation",
        vietnamese: "Tôi đang học tiếng Hàn.",
        korean: "저는 한국어를 공부하고 있어요.",
        acceptedVietnameseAnswers: [],
        acceptedKoreanAnswers: [],
        points: 1,
      },
      {
        id: "dictation-sentence-1",
        type: "dictation",
        sentence: "오늘 학교에서 친구를 만났어요.",
        acceptedAnswers: ["오늘 학교에서 친구 만났어요."],
        points: 1,
      },
    ];

    const bundle = generateLessonPractice(input);

    expect(bundle.translations).toHaveLength(1);
    expect(bundle.translations[0].source).toBe("authored");
    expect(bundle.dictations).toHaveLength(1);
    expect(bundle.dictations[0].source).toBe("authored");
    expect(bundle.dictations[0].acceptedAnswers).toContain(
      "오늘 학교에서 친구 만났어요.",
    );
  });

  it("không tạo cặp nối mơ hồ khi hai từ trùng nghĩa", () => {
    const bundle = generateLessonPractice(
      lesson([
        word(1, { vietnamese: "Trùng nghĩa" }),
        word(2, { vietnamese: "Trùng nghĩa" }),
        word(3),
        word(4),
        word(5),
      ]),
    );
    const meanings = bundle.matching.flatMap((round) =>
      round.pairs.map((pair) => pair.vietnamese),
    );
    expect(new Set(meanings).size).toBe(meanings.length);
  });
});
