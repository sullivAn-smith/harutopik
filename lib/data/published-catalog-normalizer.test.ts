import { describe, expect, it } from "vitest";
import {
  buildPublishedCourses,
  compactPublishedCatalogRowsForShells,
  type PublishedCatalogRow,
} from "./published-catalog-normalizer";

const lesson = {
  id: "lesson-topik-2-01",
  slug: "gap-go",
  courseId: "course-topik-2",
  moduleId: "module-topik-2-01",
  order: 1,
  version: 1,
  status: "published",
  title: { ko: "만남", vi: "Gặp gỡ" },
  summary: "Học cách chào hỏi khi gặp gỡ.",
  objectives: ["Chào hỏi đúng ngữ cảnh"],
  vocabulary: [],
  grammar: [],
  exercises: [],
};

describe("buildPublishedCourses", () => {
  it("thu gọn nội dung bài cho catalog danh sách nhưng giữ metadata điều hướng", () => {
    const rows: PublishedCatalogRow[] = [{
      content_id: lesson.id,
      content_type: "lesson",
      parent_id: lesson.moduleId,
      payload: {
        ...lesson,
        vocabulary: [{ id: "word-1", korean: "한국", vietnamese: "Hàn Quốc" }],
        grammar: [{ id: "grammar-1" }],
        exercises: [{ id: "exercise-1" }],
      },
    }];

    const compact = compactPublishedCatalogRowsForShells(rows);

    expect(compact[0].payload).toMatchObject({
      id: lesson.id,
      slug: lesson.slug,
      order: lesson.order,
      title: lesson.title,
      vocabulary: [],
      grammar: [],
      exercises: [],
    });
  });

  it("ghép khóa học, chương và bài đã phát hành từ catalog động", () => {
    const rows: PublishedCatalogRow[] = [
      {
        content_id: "course-topik-2",
        content_type: "course",
        parent_id: null,
        payload: {
          id: "course-topik-2",
          slug: "topik-2",
          title: { ko: "한국어 초급 2", vi: "Tiếng Hàn sơ cấp 2" },
          summary: "Lộ trình tiếp nối dành cho người học sơ cấp.",
          level: "beginner",
          lessonCount: 15,
          status: "published",
        },
      },
      {
        content_id: "module-topik-2-01",
        content_type: "module",
        parent_id: "course-topik-2",
        payload: {
          id: "module-topik-2-01",
          slug: "gap-go",
          courseId: "course-topik-2",
          title: { ko: "만남", vi: "Gặp gỡ" },
          sortOrder: 1,
        },
      },
      {
        content_id: lesson.id,
        content_type: "lesson",
        parent_id: "module-topik-2-01",
        payload: lesson,
      },
    ];

    const courses = buildPublishedCourses(rows);

    expect(courses).toHaveLength(1);
    expect(courses[0].slug).toBe("topik-2");
    expect(courses[0].modules?.[0]).toMatchObject({
      id: "module-topik-2-01",
      title: { vi: "Gặp gỡ" },
    });
    expect(courses[0].modules?.[0].lessons[0].id).toBe(lesson.id);
  });

  it("không đưa bài nháp vào catalog learner", () => {
    const rows: PublishedCatalogRow[] = [{
      content_id: lesson.id,
      content_type: "lesson",
      parent_id: "module-topik-2-01",
      payload: { ...lesson, status: "draft" },
    }];

    expect(buildPublishedCourses(rows)).toEqual([]);
  });

  it("giữ từ loại trong bản phát hành cho tới khi admin chọn giá trị mới", () => {
    const courseRow: PublishedCatalogRow = {
      content_id: "course-topik-2",
      content_type: "course",
      parent_id: null,
      payload: {
        id: "course-topik-2",
        slug: "topik-2",
        title: { ko: "한국어 초급 2", vi: "Tiếng Hàn sơ cấp 2" },
        summary: "Lộ trình tiếp nối dành cho người học sơ cấp.",
      },
    };
    const snapshotWord = {
      id: "vocabulary-adverb",
      korean: "매우",
      vietnamese: "Rất",
      romanization: "maeu",
      category: "daily-life",
      partOfSpeech: "Trạng từ",
      examples: [],
    };
    const rows: PublishedCatalogRow[] = [
      courseRow,
      {
        content_id: lesson.id,
        content_type: "lesson",
        parent_id: lesson.moduleId,
        payload: { ...lesson, vocabulary: [snapshotWord] },
      },
    ];

    const withoutAdminValue = buildPublishedCourses(
      rows,
      new Map([[lesson.id, [{ ...snapshotWord, partOfSpeech: undefined }]]]),
    );
    const withAdminValue = buildPublishedCourses(
      rows,
      new Map([[lesson.id, [{ ...snapshotWord, partOfSpeech: "Phó từ" }]]]),
    );

    expect(withoutAdminValue[0].lessons[0].vocabulary[0].partOfSpeech).toBe(
      "Trạng từ",
    );
    expect(withAdminValue[0].lessons[0].vocabulary[0].partOfSpeech).toBe(
      "Phó từ",
    );
  });
});
