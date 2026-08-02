import type { AppRole } from "@/lib/auth/permissions";

export function canManageExam(input: {
  actorId: string;
  roles: readonly AppRole[];
  ownerId: string;
}) {
  return input.actorId === input.ownerId || input.roles.includes("admin");
}
