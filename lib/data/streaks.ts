import "server-only";

import { createClient } from "@/lib/supabase/server";

export type LearnerStreak = {
  currentStreak: number;
  longestStreak: number;
  shieldCount: number;
  lastActivityDate: string | null;
  activityDates: string[];
};

export type LearnerStreakRules = {
  shieldRewardInterval: number;
  shieldRewardAmount: number;
  maxShields: number;
};

const DEFAULT_STREAK_RULES: LearnerStreakRules = {
  shieldRewardInterval: 10,
  shieldRewardAmount: 1,
  maxShields: 10,
};

const VIETNAM_TIMEZONE = "Asia/Ho_Chi_Minh";

function vietnamParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: VIETNAM_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";
  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    hour: Number(value("hour")),
  };
}

export async function getHomeStreakData(knownUserId?: string | null): Promise<{
  streak: LearnerStreak | null;
  rules: LearnerStreakRules;
  period: "day" | "night";
}> {
  const supabase = await createClient();
  const vietnam = vietnamParts();
  const period = vietnam.hour >= 5 && vietnam.hour < 18 ? "day" : "night";
  const [resolvedUserId, { data: settings }] = await Promise.all([
    knownUserId === undefined
      ? supabase.auth.getUser().then(({ data }) => data.user?.id ?? null)
      : Promise.resolve(knownUserId),
    supabase
      .from("streak_settings")
      .select("shield_reward_interval,shield_reward_amount,max_shields")
      .eq("id", true)
      .maybeSingle(),
  ]);

  let streak: LearnerStreak | null = null;
  if (resolvedUserId) {
    const [{ data: row }, { data: days }] = await Promise.all([
      supabase
        .from("user_streaks")
        .select("current_streak,longest_streak,shield_count,last_activity_date")
        .eq("user_id", resolvedUserId)
        .maybeSingle(),
      supabase
        .from("streak_activity_days")
        .select("activity_date")
        .eq("user_id", resolvedUserId)
        .order("activity_date", { ascending: false })
        .limit(14),
    ]);
    if (row) {
      streak = {
        currentStreak: row.current_streak,
        longestStreak: row.longest_streak,
        shieldCount: row.shield_count,
        lastActivityDate: row.last_activity_date,
        activityDates: (days ?? []).map((day) => day.activity_date),
      };
    }
  }

  return {
    streak,
    rules: settings
      ? {
          shieldRewardInterval: settings.shield_reward_interval,
          shieldRewardAmount: settings.shield_reward_amount,
          maxShields: settings.max_shields,
        }
      : DEFAULT_STREAK_RULES,
    period,
  };
}
