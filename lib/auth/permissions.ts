export const roles = [
  "learner",
  "content_editor",
  "content_reviewer",
  "support_agent",
  "billing_admin",
  "admin",
] as const;

export type AppRole = (typeof roles)[number];

export const permissions = [
  "learning:read",
  "profile:manage-own",
  "content:read-draft",
  "content:create",
  "content:edit",
  "content:submit-review",
  "content:approve",
  "content:publish",
  "content:unpublish",
  "learner:support-read",
  "subscription:manage",
  "role:assign",
  "audit:read",
] as const;

export type Permission = (typeof permissions)[number];

const rolePermissions: Record<AppRole, readonly Permission[]> = {
  learner: ["learning:read", "profile:manage-own"],
  content_editor: [
    "learning:read",
    "content:read-draft",
    "content:create",
    "content:edit",
    "content:submit-review",
  ],
  content_reviewer: [
    "learning:read",
    "content:read-draft",
    "content:approve",
  ],
  support_agent: ["learning:read", "learner:support-read"],
  billing_admin: ["learning:read", "subscription:manage"],
  admin: permissions,
};

export function hasPermission(
  assignedRoles: readonly AppRole[],
  permission: Permission,
) {
  return assignedRoles.some((role) =>
    rolePermissions[role].includes(permission),
  );
}

export function permissionsForRoles(assignedRoles: readonly AppRole[]) {
  return [
    ...new Set(assignedRoles.flatMap((role) => rolePermissions[role])),
  ];
}
