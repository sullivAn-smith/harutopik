import { describe, expect, it } from "vitest";
import {
  coursePath,
  courses,
  getCourseBySlug,
  getCourseParams,
  getLessonBySlug,
  getLessonParams,
  lessonPath,
} from "./catalog";

describe("content catalog", () => {
  it("tìm khóa học và bài học bằng slug", () => {
    const course = getCourseBySlug("topik-1");
    const lesson = getLessonBySlug("topik-1", "gioi-thieu");

    expect(course?.id).toBe("course-topik-1");
    expect(lesson?.id).toBe("lesson-topik-1-01");
  });

  it("trả undefined cho slug không tồn tại", () => {
    expect(getCourseBySlug("khong-ton-tai")).toBeUndefined();
    expect(getLessonBySlug("topik-1", "khong-ton-tai")).toBeUndefined();
  });

  it("tạo params và URL chuẩn từ một nguồn duy nhất", () => {
    const course = courses[0];
    const lesson = course.lessons[0];

    expect(getCourseParams()).toContainEqual({ courseSlug: "topik-1" });
    expect(getLessonParams()).toContainEqual({
      courseSlug: "topik-1",
      lessonSlug: "gioi-thieu",
    });
    expect(coursePath(course)).toBe("/courses/topik-1");
    expect(lessonPath(course, lesson)).toBe(
      "/courses/topik-1/lessons/gioi-thieu",
    );
  });
});
