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
  subtitle: "Điểm trung bình tốt nhất của 1 đề đầy đủ Nghe + Đọc",
  periodLabel: "1 đề đang xếp hạng",
  currentUserEntry: null,
  entries: [
    {
      rank: 1,
      userId: "loan",
      displayName: "Loan Đặng",
      avatarUrl: null,
      score: 4250,
      detail: "42.5% · 29 câu đúng",
    },
    {
      rank: 2,
      userId: "tuan",
      displayName: "Tuấn Hoàng",
      avatarUrl: null,
      score: 150,
      detail: "1.5% · 1 câu đúng",
    },
    {
      rank: 3,
      userId: "ngoc",
      displayName: "Ngọc Khoa - Mikey",
      avatarUrl: null,
      score: 0,
      detail: "0% · 0 câu đúng",
    },
    {
      rank: 4,
      userId: "current-user",
      displayName: "Người học hiện tại",
      avatarUrl: null,
      score: 0,
      detail: "0% · 0 câu đúng",
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
    expect(screen.getByText("Điểm trung bình")).toBeTruthy();
    expect(screen.getByText("Câu đúng")).toBeTruthy();
    expect(screen.getAllByText("1 đề đang xếp hạng")).toHaveLength(3);
    expect(screen.queryByText("Hôm nay")).toBeNull();
    expect(screen.queryByText("Xu hướng")).toBeNull();
    expect(screen.queryByText("— Chưa có dữ liệu")).toBeNull();
  });

  it("định dạng điểm và chỉ nhận board hợp lệ mà không thay đổi data contract", () => {
    expect(displayLeaderboardScore("exam", leaderboard.entries[0])).toBe(
      "42.5%",
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
  });
});
