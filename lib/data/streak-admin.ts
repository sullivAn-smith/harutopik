import "server-only";

import { requirePermission } from "@/lib/auth/authorize";
import { createAdminClient } from "@/lib/supabase/admin";

export type StreakSettings = {
  shieldRewardInterval: number;
  shieldRewardAmount: number;
  maxShields: number;
  reminderEnabled: boolean;
  reminderHour: number;
};

export type StreakManagedUser = {
  id: string;
  email: string;
  displayName: string;
  currentStreak: number;
  longestStreak: number;
  shieldCount: number;
  lastActivityDate: string | null;
};

export async function getStreakAdminData(query = "") {
  await requirePermission("role:assign");
  const admin = createAdminClient();
  const [{ data: settings, error: settingsError }, authResult] =
    await Promise.all([
      admin.from("streak_settings").select("*").eq("id", true).single(),
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);

  if (settingsError || authResult.error) {
    const cause = settingsError ?? authResult.error;
    throw new Error(`Không thể tải dữ liệu quản lý streak: ${cause?.message ?? "Lỗi không xác định"}`);
  }

  const authUsers = authResult.data.users;
  const userIds = authUsers.map((user) => user.id);
  const [{ data: profiles, error: profileError }, { data: streaks, error: streakError }] =
    userIds.length > 0
      ? await Promise.all([
          admin.from("learner_profiles").select("id,display_name").in("id", userIds),
          admin.from("user_streaks").select("user_id,current_streak,longest_streak,shield_count,last_activity_date").in("user_id", userIds),
        ])
      : [{ data: [], error: null }, { data: [], error: null }];

  if (profileError || streakError) {
    const cause = profileError ?? streakError;
    throw new Error(`Không thể tải streak của người học: ${cause?.message ?? "Lỗi không xác định"}`);
  }
  const normalizedQuery = query.trim().toLocaleLowerCase("vi");
  const users: StreakManagedUser[] = authUsers
    .map((user) => {
      const profile = profiles?.find((item) => item.id === user.id);
      const streak = streaks?.find((item) => item.user_id === user.id);
      return {
        id: user.id,
        email: user.email ?? "",
        displayName: profile?.display_name ?? "Chưa đặt tên",
        currentStreak: streak?.current_streak ?? 0,
        longestStreak: streak?.longest_streak ?? 0,
        shieldCount: streak?.shield_count ?? 0,
        lastActivityDate: streak?.last_activity_date ?? null,
      };
    })
    .filter(
      (user) =>
        !normalizedQuery ||
        user.email.toLocaleLowerCase("vi").includes(normalizedQuery) ||
        user.displayName.toLocaleLowerCase("vi").includes(normalizedQuery),
    );

  return {
    settings: {
      shieldRewardInterval: settings.shield_reward_interval,
      shieldRewardAmount: settings.shield_reward_amount,
      maxShields: settings.max_shields,
      reminderEnabled: settings.reminder_enabled,
      reminderHour: settings.reminder_hour,
    } satisfies StreakSettings,
    users,
    totalUsers: authUsers.length,
  };
}
