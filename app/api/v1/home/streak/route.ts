import { apiError, apiSuccess } from "@/lib/api/responses";
import { getApiActor } from "@/lib/api/auth";
import type { LearnerStreak, LearnerStreakRules } from "@/lib/data/streaks";

type HomeStreakData = {
  streak: LearnerStreak | null;
  rules: LearnerStreakRules;
  period: "day" | "night";
};

const defaultRules: LearnerStreakRules = {
  shieldRewardInterval: 10,
  shieldRewardAmount: 1,
  maxShields: 10,
};

function currentPeriod(): "day" | "night" {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(new Date()),
  );
  return hour >= 5 && hour < 18 ? "day" : "night";
}

export async function GET(request: Request) {
  const actor = await getApiActor(request);
  if (!actor) return apiError("UNAUTHENTICATED", "Bạn cần đăng nhập.", 401);

  const { data: summary, error: rpcError } = await actor.supabase.rpc(
    "get_home_streak_summary",
  );
  if (!rpcError && summary) {
    return apiSuccess(summary as HomeStreakData, {
      cacheControl: "private, no-store",
    });
  }

  // Keep Home functional while a new deployment is waiting for its migration.
  const [settingsResult, streakResult, daysResult] = await Promise.all([
    actor.supabase
      .from("streak_settings")
      .select("shield_reward_interval,shield_reward_amount,max_shields")
      .eq("id", true)
      .maybeSingle(),
    actor.supabase
      .from("user_streaks")
      .select("current_streak,longest_streak,shield_count,last_activity_date")
      .eq("user_id", actor.user.id)
      .maybeSingle(),
    actor.supabase
      .from("streak_activity_days")
      .select("activity_date")
      .eq("user_id", actor.user.id)
      .order("activity_date", { ascending: false })
      .limit(14),
  ]);

  if (settingsResult.error || streakResult.error || daysResult.error) {
    return apiError("STREAK_LOAD_FAILED", "Chưa thể tải chuỗi ngày học.", 500);
  }

  const settings = settingsResult.data;
  const row = streakResult.data;
  const result: HomeStreakData = {
    streak: row
      ? {
          currentStreak: row.current_streak,
          longestStreak: row.longest_streak,
          shieldCount: row.shield_count,
          lastActivityDate: row.last_activity_date,
          activityDates: (daysResult.data ?? []).map((day) => day.activity_date),
        }
      : null,
    rules: settings
      ? {
          shieldRewardInterval: settings.shield_reward_interval,
          shieldRewardAmount: settings.shield_reward_amount,
          maxShields: settings.max_shields,
        }
      : defaultRules,
    period: currentPeriod(),
  };

  return apiSuccess(result, { cacheControl: "private, no-store" });
}
