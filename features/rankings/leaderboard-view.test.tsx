// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { LeaderboardData } from "@/lib/data/rankings";
import {
  displayLeaderboardScore,
  isLeaderboardBoard,
  LeaderboardView,
} from "./leaderboard-view";

afterEach(cleanup);

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

describe("LeaderboardView", () => {
  it("trình bày hero, tab, podium và bảng Top 30 từ ranking data có sẵn", () => {
    render(
      <LeaderboardView
        board="exam"
        leaderboard={leaderboard}
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
    render(
      <LeaderboardView
        board="typing_sprint"
        leaderboard={{
          ...leaderboard,
          board: "typing_sprint",
          weeklyHistory: {
            periodLabel: "Tuần trước",
            entries: leaderboard.entries.slice(0, 1),
          },
        }}
        currentUserId="current-user"
      />,
    );

    expect(screen.queryByText("Xu hướng")).toBeNull();
    expect(screen.queryByText("— Chưa có dữ liệu")).toBeNull();
    expect(screen.queryByText("Lịch sử tuần")).toBeNull();
    expect(screen.queryByText("Top 10 tuần trước")).toBeNull();
    expect(screen.queryByRole("link", { name: "Chọn bài để chơi" })).toBeNull();
  });
});
