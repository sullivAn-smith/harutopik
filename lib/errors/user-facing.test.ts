import { describe, expect, it, vi } from "vitest";
import { toUserFacingError } from "./user-facing";

describe("toUserFacingError", () => {
  it("maps database constraints to an actionable message", () => {
    expect(toUserFacingError({ code: "23502" })).toEqual({
      code: "REQUIRED_VALUE_MISSING",
      message: "Một trường bắt buộc đang bị thiếu. Hãy kiểm tra lại toàn bộ biểu mẫu.",
    });
  });

  it("maps domain errors before generic database errors", () => {
    expect(
      toUserFacingError({
        code: "P0001",
        message: "invalid_course_module",
      }),
    ).toEqual({
      code: "INVALID_COURSE_MODULE",
      message:
        "Chương đã chọn không thuộc khóa học này. Hãy chọn lại đúng khóa học và chương.",
    });
  });

  it("tells the editor which lessons are using a vocabulary item", () => {
    expect(
      toUserFacingError({
        code: "P0001",
        message: "vocabulary_used_by_lessons:Động vật cơ bản, Ôn tập TOPIK",
      }),
    ).toEqual({
      code: "VOCABULARY_USED_BY_LESSONS",
      message:
        "Từ đang được dùng trong bài: Động vật cơ bản, Ôn tập TOPIK. Hãy gỡ từ khỏi bài trước khi xóa.",
    });
  });

  it("adds a support reference without leaking backend details", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const result = toUserFacingError(
      { code: "XX000", message: "secret internal detail" },
      "Không thể lưu bài.",
    );
    expect(result.code).toBe("UNEXPECTED_ERROR");
    expect(result.message).toMatch(
      /^Không thể lưu bài\. Nếu lỗi tiếp diễn, hãy gửi mã [A-Z0-9]{8} cho quản trị viên\.$/,
    );
    expect(result.message).not.toContain("secret internal detail");
  });
});
