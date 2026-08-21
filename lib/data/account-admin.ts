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
  progress: {
    completed: number;
    inProgress: number;
    total: number;
    overallPercent: number;
    lastStudiedAt: string | null;
  };
  subscription: "Haru Free" | "Haru Pro";
  contentCount: number;
};

export type ManagedAccountPage = {
  accounts: ManagedAccount[];
  totalCount: number;
  hasMore: boolean;
  nextOffset: number;
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

export type ManagedAccountPageRequest = ManagedAccountFilters & {
  offset?: number;
  limit?: number;
  userId?: string;
};

type ManagedAccountRow = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  primary_role: string | null;
  is_locked: boolean | null;
  last_sign_in_at: string | null;
  completed_lessons: number | string | null;
  in_progress_lessons: number | string | null;
  published_lessons: number | string | null;
  overall_progress: number | string | null;
  last_studied_at: string | null;
  subscription: string | null;
  content_count: number | string | null;
  total_count: number | string | null;
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

export async function getManagedAccountsPage(
  request: ManagedAccountPageRequest = {},
): Promise<ManagedAccountPage> {
  await requirePermission("role:assign");
  return readManagedAccountsPage(request);
}

export async function readManagedAccountsPage(
  request: ManagedAccountPageRequest = {},
): Promise<ManagedAccountPage> {
  const offset = Math.max(0, Math.floor(request.offset ?? 0));
  const limit = Math.min(100, Math.max(1, Math.floor(request.limit ?? 20)));
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_managed_accounts_page", {
    p_query: request.query?.trim() ?? "",
    p_role: request.role ?? null,
    p_status: request.status ?? null,
    p_plan: request.plan ?? null,
    p_offset: offset,
    p_limit: limit,
    p_user_id: request.userId ?? null,
  });
  if (!error) {
    const rows = (data ?? []) as ManagedAccountRow[];
    const accounts = rows.map(managedAccountFromRow);
    const totalCount = Number(rows[0]?.total_count ?? 0);
    return {
      accounts,
      totalCount,
      hasMore: offset + accounts.length < totalCount,
      nextOffset: offset + accounts.length,
    };
  }
  if (error.code !== "PGRST202" && error.code !== "42883") {
    throw new Error("Không thể tải danh sách tài khoản.");
  }

  // Keep deployments usable while the additive RPC migration is rolling out.
  return readManagedAccountsLegacy({ ...request, offset, limit });
}

function managedAccountFromRow(row: ManagedAccountRow): ManagedAccount {
  return {
    id: row.user_id,
    email: row.email ?? "",
    displayName: row.display_name ?? "Chưa đặt tên",
    role: normalizePrimaryRole(row.primary_role),
    isLocked: Boolean(row.is_locked),
    lastSignInAt: row.last_sign_in_at,
    progress: {
      completed: Number(row.completed_lessons ?? 0),
      inProgress: Number(row.in_progress_lessons ?? 0),
      total: Number(row.published_lessons ?? 0),
      overallPercent: Number(row.overall_progress ?? 0),
      lastStudiedAt: row.last_studied_at,
    },
    subscription:
      row.subscription === "Haru Pro" ? "Haru Pro" : "Haru Free",
    contentCount: Number(row.content_count ?? 0),
  };
}

function normalizePrimaryRole(value: unknown): AppRole {
  if (value === "admin" || value === "content_editor") return value;
  return "learner";
}

async function readManagedAccountsLegacy(
  request: ManagedAccountPageRequest & { offset: number; limit: number },
): Promise<ManagedAccountPage> {
  const admin = createAdminClient();
  const { data: authData, error: authError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (authError) throw new Error("Không thể tải danh sách tài khoản.");

  const users = request.userId
    ? authData.users.filter((user) => user.id === request.userId)
    : authData.users;
  const ids = users.map((user) => user.id);
  if (ids.length === 0) {
    return {
      accounts: [],
      totalCount: 0,
      hasMore: false,
      nextOffset: request.offset,
    };
  }
  const [profiles, roles, locks, progress, entitlements, content, lessons] =
    await Promise.all([
      admin.from("learner_profiles").select("id,display_name").in("id", ids),
      admin.from("user_roles").select("user_id,role").in("user_id", ids),
      admin.from("account_management").select("user_id,is_locked").in("user_id", ids),
      admin.from("lesson_progress")
        .select("user_id,lesson_id,status,completion_percent,last_studied_at")
        .in("user_id", ids),
      admin.from("entitlements").select("user_id,status,starts_at,ends_at").in("user_id", ids),
      admin.from("content_revisions").select("created_by").in("created_by", ids),
      admin.from("published_catalog").select("content_id").eq("content_type", "lesson"),
    ]);
  const errors = [
    profiles.error,
    roles.error,
    locks.error,
    progress.error,
    entitlements.error,
    content.error,
    lessons.error,
  ].filter(Boolean);
  if (errors.length > 0) throw new Error("Không thể tổng hợp dữ liệu tài khoản.");

  const publishedLessonIds = new Set(
    (lessons.data ?? []).map((lesson) => lesson.content_id),
  );
  const normalizedQuery =
    request.query?.trim().toLocaleLowerCase("vi") ?? "";
  const accounts = users
    .map((user) => {
      const displayName =
        profiles.data?.find((item) => item.id === user.id)?.display_name ??
        "Chưa đặt tên";
      const assignedRoles = roles.data?.filter((item) => item.user_id === user.id) ?? [];
      const role = normalizePrimaryRole(
        assignedRoles.find((item) => item.role === "admin")?.role ??
          assignedRoles.find((item) => item.role === "content_editor")?.role ??
          "learner",
      );
      const userProgress = (progress.data ?? []).filter(
        (item) =>
          item.user_id === user.id &&
          publishedLessonIds.has(item.lesson_id),
      );
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
          inProgress: userProgress.filter((item) => item.status === "in_progress").length,
          total: publishedLessonIds.size,
          overallPercent: publishedLessonIds.size
            ? Math.round(
                userProgress.reduce(
                  (sum, item) =>
                    sum +
                    (item.status === "completed"
                      ? 100
                      : Math.min(
                          100,
                          Math.max(0, Number(item.completion_percent ?? 0)),
                        )),
                  0,
                ) / publishedLessonIds.size,
              )
            : 0,
          lastStudiedAt:
            userProgress
              .map((item) => item.last_studied_at)
              .filter((value): value is string => Boolean(value))
              .sort()
              .at(-1) ?? null,
        },
        subscription: pro ? "Haru Pro" as const : "Haru Free" as const,
        contentCount: content.data?.filter((item) => item.created_by === user.id).length ?? 0,
      };
    })
    .filter((user) => {
      const matchesQuery = !normalizedQuery ||
        user.email.toLocaleLowerCase("vi").includes(normalizedQuery) ||
        user.displayName.toLocaleLowerCase("vi").includes(normalizedQuery);
      const matchesRole = !request.role || user.role === request.role;
      const matchesStatus = !request.status ||
        (request.status === "locked" ? user.isLocked : !user.isLocked);
      const matchesPlan = !request.plan ||
        (request.plan === "pro" ? user.subscription === "Haru Pro" : user.subscription === "Haru Free");
      return matchesQuery && matchesRole && matchesStatus && matchesPlan;
    });
  const totalCount = accounts.length;
  const page = accounts.slice(request.offset, request.offset + request.limit);
  return {
    accounts: page,
    totalCount,
    hasMore: request.offset + page.length < totalCount,
    nextOffset: request.offset + page.length,
  };
}

export async function getManagedAccountDetail(userId: string) {
  await requirePermission("role:assign");
  const admin = createAdminClient();
  const [accountPage, history, revisions] = await Promise.all([
    readManagedAccountsPage({ userId, limit: 1 }),
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
  const account = accountPage.accounts[0];
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
