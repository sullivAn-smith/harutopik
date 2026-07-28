import { describe, expect, it } from "vitest";
import { hasPermission, permissionsForRoles } from "./permissions";

describe("role permissions", () => {
  it("không cho biên tập viên tự xuất bản", () => {
    expect(hasPermission(["content_editor"], "content:edit")).toBe(true);
    expect(hasPermission(["content_editor"], "content:delete-own")).toBe(true);
    expect(hasPermission(["content_editor"], "catalog:create")).toBe(true);
    expect(hasPermission(["content_editor"], "content:publish")).toBe(false);
  });

  it("không cho learner thay đổi catalog hoặc xóa nội dung", () => {
    expect(hasPermission(["learner"], "catalog:create")).toBe(false);
    expect(hasPermission(["learner"], "content:delete-own")).toBe(false);
  });

  it("tách quyền duyệt khỏi quyền chỉnh sửa", () => {
    expect(hasPermission(["content_reviewer"], "content:approve")).toBe(true);
    expect(hasPermission(["content_reviewer"], "content:edit")).toBe(false);
  });

  it("admin có toàn bộ quyền và không trả quyền trùng", () => {
    const result = permissionsForRoles(["admin", "content_editor"]);
    expect(result).toContain("role:assign");
    expect(result.length).toBe(new Set(result).size);
  });
});
