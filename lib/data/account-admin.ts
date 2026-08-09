import "server-only";

import { requirePermission } from "@/lib/auth/authorize";
import type { AppRole } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

export type ManagedAccount = {
  id: string;
  email: string;
  displayName: string;
  role: AppRole;
  isLocked: boolean;
  lastSignInAt: string | null;
  progress: { completed: number; total: number };
  subscription: "Haru Free" | "Haru Pro";
  contentCount: number;
};

export type ManagedAccountStats = {
  registeredLearners: number;
  currentLearners: number;
  proLearners: number;
};

export type ManagedAccountFilters = {
  query?: string;
  role?: "learner" | "content_editor" | "admin";
  status?: "active" | "locked";
  plan?: "free" | "pro";
};

export async function getManagedAccountStats(): Promise<ManagedAccountStats> {
  await requirePermission("role:assign");
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const [profiles, learners, proLearners] = await Promise.all([
    admin.from("learner_profiles").select("id", { count: "exact", head: true }),
    admin.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "learner"),
    admin.from("entitlements").select("user_id")
      .eq("status", "active").lte("starts_at", now).or(`ends_at.is.null,ends_at.gt.${now}`),
  ]);
  if (profiles.error || learners.error || proLearners.error) {
    throw new Error("Không thể tải thống kê tài khoản.");
  }
  return {
    registeredLearners: profiles.count ?? 0,
    currentLearners: learners.count ?? 0,
    proLearners: new Set((proLearners.data ?? []).map((item) => item.user_id)).size,
  };
}

export async function getManagedAccounts(filters: ManagedAccountFilters | string = {}): Promise<ManagedAccount[]> {
  await requirePermission("role:assign");
  const admin = createAdminClient();
  const { data: authData, error: authError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (authError) throw new Error("Không thể tải danh sách tài khoản.");

  const users = authData.users;
  const ids = users.map((user) => user.id);
  if (ids.length === 0) return [];
  const [profiles, roles, locks, progress, entitlements, content] =
    await Promise.all([
      admin.from("learner_profiles").select("id,display_name").in("id", ids),
      admin.from("user_roles").select("user_id,role").in("user_id", ids),
      admin.from("account_management").select("user_id,is_locked").in("user_id", ids),
      admin.from("lesson_progress").select("user_id,status").in("user_id", ids),
      admin.from("entitlements").select("user_id,status,starts_at,ends_at").in("user_id", ids),
      admin.from("content_revisions").select("created_by").in("created_by", ids),
    ]);
  const errors = [profiles.error, roles.error, locks.error, progress.error, entitlements.error, content.error].filter(Boolean);
  if (errors.length > 0) throw new Error("Không thể tổng hợp dữ liệu tài khoản.");

  const normalizedFilters = typeof filters === "string" ? { query: filters } : filters;
  const normalizedQuery = normalizedFilters.query?.trim().toLocaleLowerCase("vi") ?? "";
  return users
    .map((user) => {
      const displayName =
        profiles.data?.find((item) => item.id === user.id)?.display_name ??
        "Chưa đặt tên";
      const assignedRoles = roles.data?.filter((item) => item.user_id === user.id) ?? [];
      const role = (assignedRoles.find((item) => item.role === "admin")?.role ??
        assignedRoles.find((item) => item.role === "content_editor")?.role ??
        "learner") as AppRole;
      const userProgress = progress.data?.filter((item) => item.user_id === user.id) ?? [];
      const now = Date.now();
      const pro = entitlements.data?.some(
        (item) =>
          item.user_id === user.id &&
          item.status === "active" &&
          new Date(item.starts_at).getTime() <= now &&
          (!item.ends_at || new Date(item.ends_at).getTime() > now),
      );
      return {
        id: user.id,
        email: user.email ?? "",
        displayName,
        role,
        isLocked:
          locks.data?.find((item) => item.user_id === user.id)?.is_locked ??
          Boolean(user.banned_until && new Date(user.banned_until).getTime() > now),
        lastSignInAt: user.last_sign_in_at ?? null,
        progress: {
          completed: userProgress.filter((item) => item.status === "completed").length,
          total: userProgress.length,
        },
        subscription: pro ? "Haru Pro" as const : "Haru Free" as const,
        contentCount: content.data?.filter((item) => item.created_by === user.id).length ?? 0,
      };
    })
    .filter((user) => {
      const matchesQuery = !normalizedQuery ||
        user.email.toLocaleLowerCase("vi").includes(normalizedQuery) ||
        user.displayName.toLocaleLowerCase("vi").includes(normalizedQuery);
      const matchesRole = !normalizedFilters.role || user.role === normalizedFilters.role;
      const matchesStatus = !normalizedFilters.status ||
        (normalizedFilters.status === "locked" ? user.isLocked : !user.isLocked);
      const matchesPlan = !normalizedFilters.plan ||
        (normalizedFilters.plan === "pro" ? user.subscription === "Haru Pro" : user.subscription === "Haru Free");
      return matchesQuery && matchesRole && matchesStatus && matchesPlan;
    });
}

export async function getManagedAccountDetail(userId: string) {
  await requirePermission("role:assign");
  const admin = createAdminClient();
  const [userResult, history, revisions] = await Promise.all([
    admin.auth.admin.getUserById(userId),
    admin
      .from("role_change_history")
      .select("id,previous_roles,new_role,reason,changed_at,changed_by")
      .eq("user_id", userId)
      .order("changed_at", { ascending: false }),
    admin
      .from("content_revisions")
      .select("id,content_id,status,payload,updated_at")
      .eq("created_by", userId)
      .order("updated_at", { ascending: false })
      .limit(30),
  ]);
  if (userResult.error || !userResult.data.user) return null;
  const account = (await getManagedAccounts()).find((item) => item.id === userId);
  if (!account) return null;
  return {
    account,
    history: history.data ?? [],
    revisions: (revisions.data ?? []).map((item) => ({
      id: item.id,
      contentId: item.content_id,
      status: item.status,
      updatedAt: item.updated_at,
      title:
        typeof item.payload === "object" && item.payload && "title" in item.payload
          ? String((item.payload.title as { vi?: string }).vi ?? item.content_id)
          : item.content_id,
    })),
  };
}
