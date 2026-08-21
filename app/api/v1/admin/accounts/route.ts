import { getApiActor } from "@/lib/api/auth";
import { apiError, apiSuccess } from "@/lib/api/responses";
import { readManagedAccountsPage } from "@/lib/data/account-admin";
import { hasPermission, roles, type AppRole } from "@/lib/auth/permissions";

export async function GET(request: Request) {
  const actor = await getApiActor(request);
  if (!actor) return apiError("UNAUTHENTICATED", "Bạn cần đăng nhập.", 401);

  const { data: roleRows, error: roleError } = await actor.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", actor.user.id);
  if (roleError) {
    return apiError("FORBIDDEN", "Không thể xác nhận quyền quản trị.", 403);
  }
  const actorRoles = roleRows
    .map((row) => row.role)
    .filter((role): role is AppRole => roles.includes(role as AppRole));
  if (!hasPermission(actorRoles, "role:assign")) {
    return apiError("FORBIDDEN", "Bạn không có quyền quản lý tài khoản.", 403);
  }

  const url = new URL(request.url);
  const rawOffset = Number(url.searchParams.get("offset") ?? "0");
  const rawLimit = Number(url.searchParams.get("limit") ?? "20");
  const offset = Number.isInteger(rawOffset) ? Math.max(0, rawOffset) : 0;
  const limit = Number.isInteger(rawLimit)
    ? Math.min(20, Math.max(1, rawLimit))
    : 20;
  const role = url.searchParams.get("role");
  const status = url.searchParams.get("status");
  const plan = url.searchParams.get("plan");
  const query = url.searchParams.get("q") ?? "";

  const page = await readManagedAccountsPage({
    query,
    role:
      role === "learner" || role === "content_editor" || role === "admin"
        ? role
        : undefined,
    status: status === "active" || status === "locked" ? status : undefined,
    plan: plan === "free" || plan === "pro" ? plan : undefined,
    offset,
    limit,
  });
  return apiSuccess(page, { cacheControl: "private, no-store" });
}
