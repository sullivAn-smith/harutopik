import { describe, expect, it } from "vitest";
import { canManageExam } from "./access";

describe("canManageExam", () => {
  it("cho người tạo đọc draft của mình", () => {
    expect(canManageExam({ actorId: "editor-1", roles: ["content_editor"], ownerId: "editor-1" })).toBe(true);
  });

  it("không cho editor đọc draft của người khác", () => {
    expect(canManageExam({ actorId: "editor-1", roles: ["content_editor"], ownerId: "editor-2" })).toBe(false);
  });

  it("cho admin đọc mọi đề", () => {
    expect(canManageExam({ actorId: "admin-1", roles: ["admin"], ownerId: "editor-2" })).toBe(true);
  });
});
