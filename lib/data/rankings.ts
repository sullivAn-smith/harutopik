import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  rankedSpeedGameDetails,
  type RankedSpeedGame,
  vietnamWeekStart,
  vietnamDateParts,
} from "@/lib/rankings/speed-ranking";

export type LeaderboardBoard =
  | "exam"
  | RankedSpeedGame
  | "current_streak"
  | "longest_streak";

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  score: number;
  accuracy?: number;
  durationMs?: number;
  detail: string;
  achievedAt?: string;
};

export type LeaderboardData = {
  board: LeaderboardBoard;
  title: string;
  subtitle: string;
  entries: LeaderboardEntry[];
  currentUserEntry: LeaderboardEntry | null;
  periodLabel: string;
  weeklyHistory?: {
    periodLabel: string;
    entries: LeaderboardEntry[];
  };
};

type SafeProfile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  leaderboard_opt_in: boolean;
};

type SpeedRankingRow = {
  user_id: string;
  rank_score: number;
  accuracy: number | string;
  best_combo: number;
  duration_ms: number;
  achieved_at: string;
};

type SpeedAttemptRankingRow = {
  id: string;
  user_id: string;
  score: number;
  accuracy: number | string;
  best_combo: number;
  total_questions: number;
  correct_count: number;
  remaining_seconds: number;
  total_time_ms: number;
  started_at: string;
  finished_at: string;
};

function nextDate(date: string, days = 1) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function scoreAttempt(gameType: RankedSpeedGame, attempt: SpeedAttemptRankingRow): SpeedRankingRow {
  const total = Math.max(attempt.total_questions, 1);
  const duration = attempt.total_time_ms > 0
    ? attempt.total_time_ms
    : Math.max(0, new Date(attempt.finished_at).getTime() - new Date(attempt.started_at).getTime());
  const rankScore = gameType === "typing_sprint"
    ? Math.round(Number(attempt.accuracy) * 100)
      + Math.round(attempt.correct_count / total * 1000)
      + Math.round(attempt.best_combo / total * 400)
      + attempt.remaining_seconds * 10
    : Math.round(attempt.score * ({ audio_reaction: 10, flash_reaction: 20, card_reaction: 16 }[gameType] ?? total) / total);
  return {
    user_id: attempt.user_id,
    rank_score: rankScore,
    accuracy: attempt.accuracy,
    best_combo: attempt.best_combo,
    duration_ms: duration,
    achieved_at: attempt.finished_at,
  };
}

function bestAttempts(rows: SpeedRankingRow[]) {
  const best = new Map<string, SpeedRankingRow>();
  for (const row of rows) {
    const previous = best.get(row.user_id);
    if (!previous || row.rank_score > previous.rank_score ||
      (row.rank_score === previous.rank_score && Number(row.accuracy) > Number(previous.accuracy)) ||
      (row.rank_score === previous.rank_score && Number(row.accuracy) === Number(previous.accuracy) && row.duration_ms < previous.duration_ms)) {
      best.set(row.user_id, row);
    }
  }
  return best;
}

async function safeProfiles(userIds: string[]) {
  if (!userIds.length) return new Map<string, SafeProfile>();
  const admin = createAdminClient();
  const { data } = await admin
    .from("learner_profiles")
    .select("id,display_name,avatar_url,leaderboard_opt_in")
    .in("id", [...new Set(userIds)]);
  return new Map(
    ((data ?? []) as SafeProfile[])
      .filter((profile) => profile.leaderboard_opt_in)
      .map((profile) => [profile.id, profile]),
  );
}

function withRanks(
  rows: Omit<LeaderboardEntry, "rank">[],
  currentUserId: string,
) {
  const ranked = rows.map((entry, index) => ({ ...entry, rank: index + 1 }));
  return {
    entries: ranked.slice(0, 30),
    currentUserEntry:
      ranked.find((entry) => entry.userId === currentUserId) ?? null,
  };
}

async function getSpeedLeaderboard(
  gameType: RankedSpeedGame,
  currentUserId: string,
): Promise<LeaderboardData> {
  const admin = createAdminClient();
  const periodStart = vietnamWeekStart();
  const { data } = await admin
    .from("speed_test_attempts")
    .select("id,user_id,score,accuracy,best_combo,total_questions,correct_count,remaining_seconds,total_time_ms,started_at,finished_at")
    .eq("game_type", gameType)
    .gte("finished_at", `${periodStart}T00:00:00+07:00`)
    .lt("finished_at", `${nextDate(periodStart, 7)}T00:00:00+07:00`)
    .limit(10000);
  const rows = [...bestAttempts(((data ?? []) as SpeedAttemptRankingRow[]).map((row) => scoreAttempt(gameType, row))).values()]
    .sort((left, right) => right.rank_score - left.rank_score || Number(right.accuracy) - Number(left.accuracy) || left.duration_ms - right.duration_ms);
  const profiles = await safeProfiles(rows.map((row) => row.user_id));
  const ranked = withRanks(
    rows.flatMap((row) => {
      const profile = profiles.get(row.user_id);
      if (!profile) return [];
      return [{
        userId: row.user_id,
        displayName: profile.display_name,
        avatarUrl: profile.avatar_url,
        score: row.rank_score,
        accuracy: Number(row.accuracy),
        durationMs: row.duration_ms,
        detail: `${Number(row.accuracy)}% · combo ${row.best_combo}`,
        achievedAt: row.achieved_at,
      }];
    }),
    currentUserId,
  );
  const game = rankedSpeedGameDetails[gameType];
  const currentWeekStart = vietnamWeekStart();
  const previousWeekEndDate = new Date(`${currentWeekStart}T00:00:00Z`);
  previousWeekEndDate.setUTCDate(previousWeekEndDate.getUTCDate() - 1);
  const previousWeekEnd = previousWeekEndDate.toISOString().slice(0, 10);
  const previousWeekStartDate = new Date(previousWeekEndDate);
  previousWeekStartDate.setUTCDate(previousWeekStartDate.getUTCDate() - 6);
  const previousWeekStart = previousWeekStartDate.toISOString().slice(0, 10);
  const { data: weeklyRowsData } = await admin
    .from("speed_test_attempts")
    .select("id,user_id,score,accuracy,best_combo,total_questions,correct_count,remaining_seconds,total_time_ms,started_at,finished_at")
    .eq("game_type", gameType)
    .gte("finished_at", `${previousWeekStart}T00:00:00+07:00`)
    .lt("finished_at", `${nextDate(previousWeekEnd)}T00:00:00+07:00`)
    .limit(10000);
  const weeklyBest = bestAttempts(((weeklyRowsData ?? []) as SpeedAttemptRankingRow[]).map((row) => scoreAttempt(gameType, row)));
  const weeklyProfiles = await safeProfiles([...weeklyBest.keys()]);
  const weeklyEntries = [...weeklyBest.values()]
    .flatMap((row) => {
      const profile = weeklyProfiles.get(row.user_id);
      if (!profile) return [];
      return [{
        userId: row.user_id,
        displayName: profile.display_name,
        avatarUrl: profile.avatar_url,
        score: row.rank_score,
        accuracy: Number(row.accuracy),
        durationMs: row.duration_ms,
        detail: `${Number(row.accuracy)}% · combo ${row.best_combo}`,
        achievedAt: row.achieved_at,
      }];
    })
    .sort((left, right) => right.score - left.score || Number(right.accuracy) - Number(left.accuracy) || Number(left.durationMs) - Number(right.durationMs))
    .slice(0, 10)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
  return {
    board: gameType,
    title: game.label,
    subtitle: game.config,
    periodLabel: `Tuần từ ${new Date(`${periodStart}T00:00:00Z`).toLocaleDateString("vi-VN")}`,
    weeklyHistory: {
      periodLabel: `${new Date(`${previousWeekStart}T00:00:00Z`).toLocaleDateString("vi-VN")} – ${new Date(`${previousWeekEnd}T00:00:00Z`).toLocaleDateString("vi-VN")}`,
      entries: weeklyEntries,
    },
    ...ranked,
  };
}

async function getStreakLeaderboard(
  field: "current_streak" | "longest_streak",
  currentUserId: string,
): Promise<LeaderboardData> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("user_streaks")
    .select(`user_id,${field},last_activity_date`)
    .gt(field, 0)
    .order(field, { ascending: false })
    .order("last_activity_date", { ascending: false });
  const rows = (data ?? []) as unknown as Array<{
    user_id: string;
    current_streak?: number;
    longest_streak?: number;
    last_activity_date: string | null;
  }>;
  const profiles = await safeProfiles(rows.map((row) => row.user_id));
  const ranked = withRanks(
    rows.flatMap((row) => {
      const profile = profiles.get(row.user_id);
      if (!profile) return [];
      const score = Number(row[field] ?? 0);
      return [{
        userId: row.user_id,
        displayName: profile.display_name,
        avatarUrl: profile.avatar_url,
        score,
        detail: `${score} ngày`,
      }];
    }),
    currentUserId,
  );
  return {
    board: field,
    title: field === "current_streak" ? "Chuỗi hiện tại" : "Kỷ lục chuỗi",
    subtitle:
      field === "current_streak"
        ? "Những chuỗi học tập đang được duy trì"
        : "Chuỗi học dài nhất mỗi người từng đạt",
    periodLabel: "Mọi thời đại",
    ...ranked,
  };
}

async function getExamLeaderboard(
  currentUserId: string,
): Promise<LeaderboardData> {
  const admin = createAdminClient();
  const { data: exams } = await admin
    .from("exam_sets")
    .select("id,title,published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(3);
  const examIds = (exams ?? []).map((exam) => exam.id);
  if (!examIds.length) {
    return {
      board: "exam",
      title: "Luyện đề tổng hợp",
      subtitle: "Chỉ tính lượt làm đầy đủ cả Nghe và Đọc",
      entries: [],
      currentUserEntry: null,
      periodLabel: "Chưa có đề được xếp hạng",
    };
  }
  const { data } = await admin
    .from("exam_user_records")
    .select(
      "user_id,exam_id,best_percentage,correct_count,duration_seconds,achieved_at",
    )
    .in("exam_id", examIds);
  const byUser = new Map<
    string,
    Array<{
      best_percentage: number | string;
      correct_count: number;
      duration_seconds: number;
      achieved_at: string;
    }>
  >();
  for (const row of data ?? []) {
    const current = byUser.get(row.user_id) ?? [];
    current.push(row);
    byUser.set(row.user_id, current);
  }
  const required = examIds.length;
  const eligible = [...byUser.entries()].filter(
    ([, records]) => records.length === required,
  );
  const profiles = await safeProfiles(eligible.map(([userId]) => userId));
  const rows = eligible.flatMap(([userId, records]) => {
    const profile = profiles.get(userId);
    if (!profile) return [];
    const average =
      records.reduce(
        (sum, record) => sum + Number(record.best_percentage),
        0,
      ) / records.length;
    const correct = records.reduce(
      (sum, record) => sum + record.correct_count,
      0,
    );
    const duration = records.reduce(
      (sum, record) => sum + record.duration_seconds,
      0,
    );
    return [{
      userId,
      displayName: profile.display_name,
      avatarUrl: profile.avatar_url,
      score: Math.round(average * 100),
      accuracy: Math.round(average * 10) / 10,
      durationMs: duration * 1000,
      detail: `${Math.round(average * 10) / 10}% · ${correct} câu đúng`,
      achievedAt: records
        .map((record) => record.achieved_at)
        .sort()
        .at(-1),
    }];
  }).sort(
    (left, right) =>
      right.score - left.score ||
      Number(right.accuracy ?? 0) - Number(left.accuracy ?? 0) ||
      Number(left.durationMs ?? 0) - Number(right.durationMs ?? 0) ||
      String(left.achievedAt).localeCompare(String(right.achievedAt)),
  );
  return {
    board: "exam",
    title: "Luyện đề tổng hợp",
    subtitle: `Điểm trung bình tốt nhất của ${required} đề đầy đủ Nghe + Đọc gần nhất`,
    periodLabel: `${required} đề đang xếp hạng`,
    ...withRanks(rows, currentUserId),
  };
}

export async function getLeaderboard(
  board: LeaderboardBoard,
  currentUserId: string,
) {
  if (board === "exam") return getExamLeaderboard(currentUserId);
  if (board === "current_streak" || board === "longest_streak") {
    return getStreakLeaderboard(board, currentUserId);
  }
  return getSpeedLeaderboard(board, currentUserId);
}

export async function getRankedAttemptsRemaining(
  userId: string,
  gameType: RankedSpeedGame,
) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("speed_test_ranked_daily_usage")
    .select("attempt_count")
    .eq("user_id", userId)
    .eq("game_type", gameType)
    .eq("ranking_date", vietnamDateParts().date)
    .maybeSingle();
  return Math.max(0, 3 - Number(data?.attempt_count ?? 0));
}
