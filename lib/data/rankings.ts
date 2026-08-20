import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  rankedSpeedGameDetails,
  rankedSpeedGames,
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

export type LeaderboardSnapshot = {
  generatedAt: string;
  boards: Record<LeaderboardBoard, LeaderboardData>;
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

type SnapshotRow = {
  rank?: unknown;
  userId?: unknown;
  displayName?: unknown;
  avatarUrl?: unknown;
  score?: unknown;
  accuracy?: unknown;
  durationMs?: unknown;
  bestCombo?: unknown;
  examCount?: unknown;
  correctCount?: unknown;
  achievedAt?: unknown;
};

const allLeaderboardBoards: LeaderboardBoard[] = [
  "exam",
  ...rankedSpeedGames,
  "current_streak",
  "longest_streak",
];

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
    .from("speed_test_ranking_records")
    .select("user_id,rank_score,accuracy,best_combo,duration_ms,achieved_at")
    .eq("game_type", gameType)
    .eq("period_start", periodStart)
    .order("rank_score", { ascending: false })
    .order("accuracy", { ascending: false })
    .order("duration_ms", { ascending: true })
    .order("achieved_at", { ascending: true });
  const rows = (data ?? []) as SpeedRankingRow[];
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
  return {
    board: gameType,
    title: game.label,
    subtitle: game.config,
    periodLabel: `Tuần từ ${new Date(`${periodStart}T00:00:00Z`).toLocaleDateString("vi-VN")}`,
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
    .select("id")
    .eq("status", "published")
    .order("published_at", { ascending: true, nullsFirst: false });
  const examIds = (exams ?? []).map((exam) => exam.id);
  if (!examIds.length) {
    return {
      board: "exam",
      title: "Luyện đề tổng hợp",
      subtitle: "Tổng điểm tốt nhất từ tất cả đề đã hoàn thành",
      entries: [],
      currentUserEntry: null,
      periodLabel: "Chưa có đề được xếp hạng",
    };
  }
  const { data } = await admin
    .from("exam_user_records")
    .select(
      "user_id,exam_id,best_score,max_score,best_percentage,correct_count,duration_seconds,achieved_at",
    )
    .in("exam_id", examIds);
  const byUser = new Map<
    string,
    Array<{
      best_percentage: number | string;
      best_score: number;
      max_score: number;
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
  const participants = [...byUser.entries()];
  const profiles = await safeProfiles(participants.map(([userId]) => userId));
  const rows = participants.flatMap(([userId, records]) => {
    const profile = profiles.get(userId);
    if (!profile) return [];
    const score = records.reduce((sum, record) => sum + record.best_score, 0);
    const maxScore = records.reduce((sum, record) => sum + record.max_score, 0);
    const accuracy = maxScore > 0 ? score / maxScore * 100 : 0;
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
      score,
      accuracy: Math.round(accuracy * 10) / 10,
      durationMs: duration * 1000,
      detail: `${records.length} đề · ${correct} câu đúng · ${formatDuration(duration)}`,
      achievedAt: records
        .map((record) => record.achieved_at)
        .sort()
        .at(-1),
    }];
  }).sort(
    (left, right) =>
      right.score - left.score ||
      Number(left.durationMs ?? 0) - Number(right.durationMs ?? 0) ||
      Number(right.accuracy ?? 0) - Number(left.accuracy ?? 0) ||
      String(left.achievedAt).localeCompare(String(right.achievedAt)),
  );
  return {
    board: "exam",
    title: "Luyện đề tổng hợp",
    subtitle: "Cộng điểm tốt nhất của mọi đề; bằng điểm ưu tiên tổng thời gian thấp hơn",
    periodLabel: `${examIds.length} đề đã phát hành`,
    ...withRanks(rows, currentUserId),
  };
}

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

function finiteNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function snapshotEntry(
  board: LeaderboardBoard,
  value: unknown,
): LeaderboardEntry | null {
  if (!value || typeof value !== "object") return null;
  const row = value as SnapshotRow;
  const rank = finiteNumber(row.rank);
  const score = finiteNumber(row.score);
  if (
    rank === null ||
    rank < 1 ||
    score === null ||
    typeof row.userId !== "string" ||
    typeof row.displayName !== "string"
  ) {
    return null;
  }

  const accuracy = finiteNumber(row.accuracy);
  const durationMs = finiteNumber(row.durationMs);
  const bestCombo = finiteNumber(row.bestCombo);
  const examCount = finiteNumber(row.examCount);
  const correctCount = finiteNumber(row.correctCount);
  let detail: string;
  if (board === "exam") {
    detail = `${examCount ?? 0} đề · ${correctCount ?? 0} câu đúng · ${formatDuration(
      Math.floor((durationMs ?? 0) / 1000),
    )}`;
  } else if (board === "current_streak" || board === "longest_streak") {
    detail = `${score} ngày`;
  } else {
    detail = `${accuracy ?? 0}% · combo ${bestCombo ?? 0}`;
  }

  return {
    rank,
    userId: row.userId,
    displayName: row.displayName,
    avatarUrl: typeof row.avatarUrl === "string" ? row.avatarUrl : null,
    score,
    ...(accuracy === null ? {} : { accuracy }),
    ...(durationMs === null ? {} : { durationMs }),
    detail,
    ...(typeof row.achievedAt === "string"
      ? { achievedAt: row.achievedAt }
      : {}),
  };
}

function leaderboardMetadata(
  board: LeaderboardBoard,
  periodStart: string,
  publishedExamCount: number,
) {
  if (board === "exam") {
    return {
      title: "Luyện đề tổng hợp",
      subtitle:
        "Cộng điểm tốt nhất của mọi đề; bằng điểm ưu tiên tổng thời gian thấp hơn",
      periodLabel:
        publishedExamCount > 0
          ? `${publishedExamCount} đề đã phát hành`
          : "Chưa có đề được xếp hạng",
    };
  }
  if (board === "current_streak" || board === "longest_streak") {
    return {
      title: board === "current_streak" ? "Chuỗi hiện tại" : "Kỷ lục chuỗi",
      subtitle:
        board === "current_streak"
          ? "Những chuỗi học tập đang được duy trì"
          : "Chuỗi học dài nhất mỗi người từng đạt",
      periodLabel: "Mọi thời đại",
    };
  }
  const game = rankedSpeedGameDetails[board];
  return {
    title: game.label,
    subtitle: game.config,
    periodLabel: `Tuần từ ${new Date(
      `${periodStart}T00:00:00Z`,
    ).toLocaleDateString("vi-VN")}`,
  };
}

function normalizeLeaderboardSnapshot(
  value: unknown,
  currentUserId: string,
): LeaderboardSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const root = value as {
    generatedAt?: unknown;
    periodStart?: unknown;
    publishedExamCount?: unknown;
    boards?: unknown;
  };
  if (!root.boards || typeof root.boards !== "object") return null;
  const rawBoards = root.boards as Record<string, unknown>;
  if (
    !allLeaderboardBoards.every((board) => Array.isArray(rawBoards[board]))
  ) {
    return null;
  }
  const periodStart =
    typeof root.periodStart === "string"
      ? root.periodStart
      : vietnamWeekStart();
  const publishedExamCount = finiteNumber(root.publishedExamCount) ?? 0;
  const boards = {} as Record<LeaderboardBoard, LeaderboardData>;

  for (const board of allLeaderboardBoards) {
    const rows = Array.isArray(rawBoards[board]) ? rawBoards[board] : [];
    const ranked = rows
      .map((row) => snapshotEntry(board, row))
      .filter((entry): entry is LeaderboardEntry => entry !== null)
      .sort((left, right) => left.rank - right.rank);
    boards[board] = {
      board,
      ...leaderboardMetadata(board, periodStart, publishedExamCount),
      entries: ranked.filter((entry) => entry.rank <= 30),
      currentUserEntry:
        ranked.find((entry) => entry.userId === currentUserId) ?? null,
    };
  }

  return {
    generatedAt:
      typeof root.generatedAt === "string"
        ? root.generatedAt
        : new Date().toISOString(),
    boards,
  };
}

async function getLegacyLeaderboard(
  board: LeaderboardBoard,
  currentUserId: string,
) {
  if (board === "exam") return getExamLeaderboard(currentUserId);
  if (board === "current_streak" || board === "longest_streak") {
    return getStreakLeaderboard(board, currentUserId);
  }
  return getSpeedLeaderboard(board, currentUserId);
}

function emptyLeaderboard(board: LeaderboardBoard): LeaderboardData {
  return {
    board,
    ...leaderboardMetadata(board, vietnamWeekStart(), 0),
    entries: [],
    currentUserEntry: null,
  };
}

export async function getLeaderboardSnapshot(
  currentUserId: string,
): Promise<LeaderboardSnapshot> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_leaderboard_snapshot", {
    p_current_user_id: currentUserId,
  });
  if (!error) {
    const snapshot = normalizeLeaderboardSnapshot(data, currentUserId);
    if (snapshot) return snapshot;
  } else if (error.code !== "PGRST202" && error.code !== "42883") {
    console.error("Leaderboard snapshot RPC failed; using legacy reads.", error);
  }

  const entries = await Promise.allSettled(
    allLeaderboardBoards.map(async (board) => [
      board,
      await getLegacyLeaderboard(board, currentUserId),
    ] as const),
  );
  const boards = {} as Record<LeaderboardBoard, LeaderboardData>;
  entries.forEach((result, index) => {
    const board = allLeaderboardBoards[index];
    if (result.status === "fulfilled") {
      boards[board] = result.value[1];
    } else {
      console.error(`Legacy leaderboard fallback failed for ${board}.`, result.reason);
      boards[board] = emptyLeaderboard(board);
    }
  });
  return {
    generatedAt: new Date().toISOString(),
    boards,
  };
}

export async function getLeaderboard(
  board: LeaderboardBoard,
  currentUserId: string,
) {
  const snapshot = await getLeaderboardSnapshot(currentUserId);
  return snapshot.boards[board];
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
