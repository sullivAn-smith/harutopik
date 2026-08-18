import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentActor } from "@/lib/auth/authorize";
import {
  getLeaderboard,
  type LeaderboardBoard,
} from "@/lib/data/rankings";
import {
  isLeaderboardBoard,
  LeaderboardView,
} from "@/features/rankings/leaderboard-view";

export const metadata: Metadata = { title: "Bảng xếp hạng" };
export const dynamic = "force-dynamic";

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ board?: string }>;
}) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/dang-nhap?next=%2Fbang-xep-hang");
  const query = await searchParams;
  const board: LeaderboardBoard = isLeaderboardBoard(query.board)
    ? query.board
    : "exam";
  const leaderboard = await getLeaderboard(board, actor.id);

  return <LeaderboardView board={board} leaderboard={leaderboard} currentUserId={actor.id} />;
}
