import { describe, expect, it } from "vitest";
import {
  buildTopikShelf,
  getAdditionalPublishedCourses,
  getTopikBookLevelLabel,
} from "./course-shelf";

describe("course shelf", () => {
  it("giữ đủ sáu bìa và chỉ mở đúng slug đã phát hành", () => {
    const shelf = buildTopikShelf([
      { id: "course-1", slug: "topik-1" },
      { id: "course-2", slug: "topik-2" },
    ]);

    expect(shelf).toHaveLength(6);
    expect(shelf[0].course?.id).toBe("course-1");
    expect(shelf[1].course?.id).toBe("course-2");
    expect(shelf[2].course).toBeNull();
  });

  it("không dùng khóa thử nghiệm để mở nhầm bìa TOPIK chuẩn", () => {
    const courses = [{ id: "test", slug: "topik-2-testing" }];

    expect(buildTopikShelf(courses)[1].course).toBeNull();
    expect(getAdditionalPublishedCourses(courses)).toEqual(courses);
  });

  it("hiển thị đúng số quyển trên nhãn cấp độ bài học", () => {
    expect(
      [1, 2, 3, 4, 5, 6].map((number) =>
        getTopikBookLevelLabel(`topik-${number}`),
      ),
    ).toEqual([
      "SƠ CẤP 1",
      "SƠ CẤP 2",
      "SƠ CẤP 3",
      "SƠ CẤP 4",
      "SƠ CẤP 5",
      "SƠ CẤP 6",
    ]);
    expect(getTopikBookLevelLabel("topik-2-testing")).toBeUndefined();
  });
});
