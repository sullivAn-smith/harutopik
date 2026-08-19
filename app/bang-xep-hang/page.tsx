import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/authorize";
import {
  getLeaderboard,
  type LeaderboardBoard,
} from "@/lib/data/rankings";
import {
  isLeaderboardBoard,
  LeaderboardView,
} from "@/features/rankings/leaderboard-view";

export const metadata: Metadata = { title: "Bảng xếp hạng" };
export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ board?: string }>;
}) {
  const [user, query] = await Promise.all([getCurrentUser(), searchParams]);
  if (!user) redirect("/dang-nhap?next=%2Fbang-xep-hang");
  const board: LeaderboardBoard = isLeaderboardBoard(query.board)
    ? query.board
    : "exam";
  const leaderboard = await getLeaderboard(board, user.id);

  return <LeaderboardView board={board} leaderboard={leaderboard} currentUserId={user.id} />;
}
