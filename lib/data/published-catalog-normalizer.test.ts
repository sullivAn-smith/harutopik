import { describe, expect, it } from "vitest";
import { buildPublishedCourses, type PublishedCatalogRow } from "./published-catalog-normalizer";

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
});
