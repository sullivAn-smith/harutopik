import { describe, expect, it } from "vitest";
import { hasPermission, permissionsForRoles } from "./permissions";

describe("role permissions", () => {
  it("không cho biên tập viên tự xuất bản", () => {
    expect(hasPermission(["content_editor"], "content:edit")).toBe(true);
    expect(hasPermission(["content_editor"], "content:publish")).toBe(false);
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
