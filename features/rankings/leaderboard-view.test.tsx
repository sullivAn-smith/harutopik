// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type {
  LeaderboardBoard,
  LeaderboardData,
  LeaderboardSnapshot,
} from "@/lib/data/rankings";
import {
  displayLeaderboardScore,
  LeaderboardView,
} from "./leaderboard-view";
import { isLeaderboardBoard } from "@/lib/rankings/leaderboard-config";

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});

const leaderboard: LeaderboardData = {
  board: "exam",
  title: "Luyện đề tổng hợp",
  subtitle: "Cộng điểm tốt nhất của mọi đề; bằng điểm ưu tiên tổng thời gian thấp hơn",
  periodLabel: "1 đề đã phát hành",
  currentUserEntry: null,
  entries: [
    {
      rank: 1,
      userId: "loan",
      displayName: "Loan Đặng",
      avatarUrl: null,
      score: 170,
      detail: "1 đề · 29 câu đúng · 01:02:03",
    },
    {
      rank: 2,
      userId: "tuan",
      displayName: "Tuấn Hoàng",
      avatarUrl: null,
      score: 6,
      detail: "1 đề · 1 câu đúng · 01:15:00",
    },
    {
      rank: 3,
      userId: "ngoc",
      displayName: "Ngọc Khoa - Mikey",
      avatarUrl: null,
      score: 0,
      detail: "1 đề · 0 câu đúng · 01:20:00",
    },
    {
      rank: 4,
      userId: "current-user",
      displayName: "Người học hiện tại",
      avatarUrl: null,
      score: 0,
      detail: "1 đề · 0 câu đúng · 01:30:00",
    },
  ],
};

function boardData(board: LeaderboardBoard): LeaderboardData {
  if (board === "exam") return leaderboard;
  if (board === "current_streak" || board === "longest_streak") {
    return {
      ...leaderboard,
      board,
      title: board === "current_streak" ? "Chuỗi hiện tại" : "Kỷ lục chuỗi",
      subtitle: "Chuỗi học",
      periodLabel: "Mọi thời đại",
      entries: leaderboard.entries.map((entry) => ({
        ...entry,
        detail: `${entry.score} ngày`,
      })),
    };
  }
  const titles = {
    typing_sprint: "Typing Sprint",
    audio_reaction: "Audio Reaction",
    flash_reaction: "Flash Recall",
    card_reaction: "Card Reaction",
  };
  return {
    ...leaderboard,
    board,
    title: titles[board],
    subtitle: "Thành tích tốt nhất trong tuần",
    periodLabel: "Tuần từ 17/8/2026",
  };
}

const snapshot: LeaderboardSnapshot = {
  generatedAt: new Date().toISOString(),
  boards: {
    exam: boardData("exam"),
    typing_sprint: boardData("typing_sprint"),
    audio_reaction: boardData("audio_reaction"),
    flash_reaction: boardData("flash_reaction"),
    card_reaction: boardData("card_reaction"),
    current_streak: boardData("current_streak"),
    longest_streak: boardData("longest_streak"),
  },
};

describe("LeaderboardView", () => {
  it("trình bày hero, tab, podium và bảng Top 30 từ ranking data có sẵn", () => {
    render(
      <LeaderboardView
        initialBoard="exam"
        initialSnapshot={snapshot}
        currentUserId="current-user"
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Bảng xếp hạng" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /Luyện đề/ }).getAttribute("href"),
    ).toBe("/bang-xep-hang");
    expect(
      screen.getByRole("heading", { name: "Luyện đề tổng hợp" }),
    ).toBeTruthy();
    expect(screen.getAllByLabelText("Hạng 1")).toHaveLength(2);
    expect(screen.getAllByText("Loan Đặng")).toHaveLength(2);
    expect(screen.getByText("Tổng điểm")).toBeTruthy();
    expect(screen.getByText("Đề · thời gian")).toBeTruthy();
    expect(screen.getAllByText("1 đề đã phát hành")).toHaveLength(3);
    expect(screen.queryByText("Hôm nay")).toBeNull();
    expect(screen.queryByText("Xu hướng")).toBeNull();
    expect(screen.queryByText("— Chưa có dữ liệu")).toBeNull();
  });

  it("định dạng điểm và chỉ nhận board hợp lệ mà không thay đổi data contract", () => {
    expect(displayLeaderboardScore("exam", leaderboard.entries[0])).toBe(
      "170 điểm",
    );
    expect(isLeaderboardBoard("typing_sprint")).toBe(true);
    expect(isLeaderboardBoard("not-a-board")).toBe(false);
  });

  it("không hiển thị xu hướng và lịch sử tuần trên bảng speed test", () => {
    const speedSnapshot: LeaderboardSnapshot = {
      ...snapshot,
      boards: {
        ...snapshot.boards,
        typing_sprint: {
          ...snapshot.boards.typing_sprint,
          weeklyHistory: {
            periodLabel: "Tuần trước",
            entries: leaderboard.entries.slice(0, 1),
          },
        },
      },
    };
    render(
      <LeaderboardView
        initialBoard="typing_sprint"
        initialSnapshot={speedSnapshot}
        currentUserId="current-user"
      />,
    );

    expect(screen.queryByText("Xu hướng")).toBeNull();
    expect(screen.queryByText("— Chưa có dữ liệu")).toBeNull();
    expect(screen.queryByText("Lịch sử tuần")).toBeNull();
    expect(screen.queryByText("Top 10 tuần trước")).toBeNull();
    expect(screen.queryByRole("link", { name: "Chọn bài để chơi" })).toBeNull();
  });

  it("chuyển tab bằng snapshot trong bộ nhớ và đồng bộ URL", () => {
    render(
      <LeaderboardView
        initialBoard="exam"
        initialSnapshot={snapshot}
        currentUserId="current-user"
      />,
    );

    fireEvent.click(screen.getByRole("link", { name: /Audio/ }));

    expect(
      screen.getByRole("heading", { name: "Audio Reaction" }),
    ).toBeTruthy();
    expect(window.location.pathname).toBe("/bang-xep-hang");
    expect(window.location.search).toBe("?board=audio_reaction");
  });
});
