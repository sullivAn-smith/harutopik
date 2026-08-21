import type { LeaderboardBoard } from "@/lib/data/rankings";
import {
  rankedSpeedGameDetails,
  rankedSpeedGames,
} from "@/lib/rankings/speed-ranking";

export const leaderboardBoards: Array<{
  key: LeaderboardBoard;
  label: string;
  icon: string;
}> = [
  { key: "exam", label: "Luyện đề", icon: "✎" },
  ...rankedSpeedGames.map((game) => ({
    key: game,
    label: rankedSpeedGameDetails[game].shortLabel,
    icon: rankedSpeedGameDetails[game].icon,
  })),
  { key: "current_streak", label: "Streak hiện tại", icon: "♨" },
  { key: "longest_streak", label: "Streak dài nhất", icon: "♛" },
];

export function isLeaderboardBoard(
  value: string | undefined,
): value is LeaderboardBoard {
  return leaderboardBoards.some((board) => board.key === value);
}

export function leaderboardHref(board: LeaderboardBoard) {
  return board === "exam"
    ? "/bang-xep-hang"
    : `/bang-xep-hang?board=${board}`;
}
