import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/authorize";
import {
  getLeaderboardSnapshot,
  type LeaderboardBoard,
} from "@/lib/data/rankings";
import {
  LeaderboardView,
} from "@/features/rankings/leaderboard-view";
import { isLeaderboardBoard } from "@/lib/rankings/leaderboard-config";

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
  const snapshot = await getLeaderboardSnapshot(user.id);

  return (
    <LeaderboardView
      initialBoard={board}
      initialSnapshot={snapshot}
      currentUserId={user.id}
    />
  );
}
