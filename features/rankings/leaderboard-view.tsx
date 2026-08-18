import Link from "next/link";

import { LeaderboardAvatar } from "@/features/rankings/leaderboard-avatar";
import type {
  LeaderboardBoard,
  LeaderboardData,
  LeaderboardEntry,
} from "@/lib/data/rankings";
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

function leaderboardHref(board: LeaderboardBoard) {
  return board === "exam" ? "/bang-xep-hang" : `/bang-xep-hang?board=${board}`;
}

export function displayLeaderboardScore(
  board: LeaderboardBoard,
  entry: LeaderboardEntry,
) {
  if (board === "exam") return `${(entry.score / 100).toFixed(1)}%`;
  if (board === "current_streak" || board === "longest_streak") {
    return `${entry.score} ngày`;
  }
  return entry.score.toLocaleString("vi-VN");
}

function detailColumnLabel(board: LeaderboardBoard) {
  return board === "exam" ? "Câu đúng" : "Thành tích";
}

function rankPresentation(rank: number) {
  if (rank === 1) return { medal: "🥇", label: "Hạng 1" };
  if (rank === 2) return { medal: "🥈", label: "Hạng 2" };
  if (rank === 3) return { medal: "🥉", label: "Hạng 3" };
  return { medal: null, label: `Hạng ${rank}` };
}

function LeaderboardHero({
  periodLabel,
}: {
  periodLabel: string;
}) {
  return (
    <header className="relative rounded-[1.75rem] border border-slate-200/80 bg-white/80 px-5 py-5 shadow-[0_16px_42px_rgba(15,43,76,.08)] sm:px-8 sm:py-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-black text-[#38506d] transition hover:-translate-y-0.5 hover:border-sky-200 hover:text-[#087eba]"
        >
          <span aria-hidden="true">←</span>
          Trang chủ
        </Link>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-800">
          <span aria-hidden="true">🔥</span>
          {periodLabel}
        </span>
      </div>

      <div className="mx-auto mt-5 max-w-2xl text-center">
        <p className="text-[.68rem] font-black uppercase tracking-[.24em] text-[#087eba]">
          Harutopik League
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-[-.045em] text-[#10243e] sm:text-5xl">
          Bảng xếp hạng
        </h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-[#66758a] sm:text-base">
          Ghi nhận thành tích nổi bật và duy trì động lực học tiếng Hàn mỗi ngày.
        </p>
      </div>
    </header>
  );
}

function LeaderboardTabs({ board }: { board: LeaderboardBoard }) {
  return (
    <nav
      aria-label="Loại bảng xếp hạng"
      className="mt-4 flex gap-1.5 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/80 p-1.5 shadow-[0_10px_26px_rgba(16,36,62,.06)] sm:justify-center"
    >
      {leaderboardBoards.map((item) => {
        const active = board === item.key;
        return (
          <Link
            key={item.key}
            href={leaderboardHref(item.key)}
            aria-current={active ? "page" : undefined}
            className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-black transition duration-200 ${
              active
                ? "bg-[#087eba] text-white shadow-[0_6px_16px_rgba(8,126,186,.22)]"
                : "text-[#59697e] hover:bg-slate-50 hover:text-[#10243e]"
            }`}
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function RankingPeriodLabel({ periodLabel }: { periodLabel: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-[#64748b]">
      <span className="text-[#10243e]">Chu kỳ</span>
      <span className="h-3 w-px bg-slate-200" />
      {periodLabel}
    </span>
  );
}

function PodiumMember({
  board,
  entry,
  place,
}: {
  board: LeaderboardBoard;
  entry: LeaderboardEntry;
  place: 1 | 2 | 3;
}) {
  const featured = place === 1;
  const styles = {
    1: {
      card: "order-1 col-span-2 min-h-[18rem] border-amber-200 bg-[radial-gradient(circle_at_50%_0%,rgba(253,230,138,.72),transparent_54%),linear-gradient(180deg,#fffdf4,#fff)] shadow-[0_20px_46px_rgba(190,130,16,.15)] md:order-2 md:col-span-1 md:-translate-y-4",
      avatar: "bg-gradient-to-br from-amber-200 via-yellow-50 to-amber-400 p-1.5 shadow-[0_10px_24px_rgba(190,130,16,.22)]",
      label: "bg-amber-100 text-amber-900",
      score: "border-amber-100 bg-white/80",
      floor: "bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300",
    },
    2: {
      card: "order-2 min-h-[14rem] border-slate-200 bg-[radial-gradient(circle_at_50%_0%,rgba(226,232,240,.72),transparent_55%),linear-gradient(180deg,#f8fafc,#fff)] md:order-1 md:mb-5",
      avatar: "bg-gradient-to-br from-slate-200 via-white to-slate-400 p-1 shadow-[0_8px_18px_rgba(71,85,105,.14)]",
      label: "bg-slate-100 text-slate-700",
      score: "border-slate-100 bg-white/80",
      floor: "bg-gradient-to-r from-slate-300 via-slate-400 to-slate-300",
    },
    3: {
      card: "order-3 min-h-[13rem] border-orange-200 bg-[radial-gradient(circle_at_50%_0%,rgba(254,215,170,.68),transparent_55%),linear-gradient(180deg,#fff7ed,#fff)] md:mb-2",
      avatar: "bg-gradient-to-br from-orange-200 via-orange-50 to-orange-400 p-1 shadow-[0_8px_18px_rgba(194,65,12,.15)]",
      label: "bg-orange-100 text-orange-800",
      score: "border-orange-100 bg-white/80",
      floor: "bg-gradient-to-r from-orange-300 via-orange-400 to-orange-300",
    },
  };
  const rank = rankPresentation(place);
  const title = place === 1 ? "Dẫn đầu bảng" : `Hạng ${place}`;

  return (
    <article
      className={`relative flex flex-col items-center justify-center overflow-hidden rounded-[1.5rem] border px-4 py-5 text-center sm:px-5 ${styles[place].card}`}
    >
      <span
        aria-hidden="true"
        className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/55 blur-2xl"
      />
      <span
        className={`absolute left-4 top-4 grid h-8 w-8 place-items-center rounded-full text-lg ${
          place === 1
            ? "bg-amber-100"
            : place === 2
              ? "bg-slate-100"
              : "bg-orange-100"
        }`}
        aria-label={rank.label}
      >
        {rank.medal}
      </span>
      {place === 1 && (
        <span
          aria-hidden="true"
          className="absolute right-4 top-4 text-xl text-amber-500"
        >
          ♛
        </span>
      )}
      <div className={`relative rounded-full ${styles[place].avatar}`}>
        <LeaderboardAvatar
          avatarUrl={entry.avatarUrl}
          displayName={entry.displayName}
          size={featured ? "champion" : "podium"}
        />
      </div>
      <span className={`mt-3 rounded-full px-2.5 py-1 text-[.65rem] font-black uppercase tracking-[.12em] ${styles[place].label}`}>
        {title}
      </span>
      <h3 className="mt-2 max-w-full truncate text-base font-black text-[#10243e] sm:text-lg">
        {entry.displayName}
      </h3>
      <div className={`mt-3 rounded-2xl border px-4 py-2 ${styles[place].score}`}>
        <strong
          className={`block font-black tracking-tight ${
            featured
              ? "text-3xl text-[#087eba]"
              : "text-2xl text-[#245d93]"
          }`}
        >
          {displayLeaderboardScore(board, entry)}
        </strong>
        <span className="mt-0.5 block text-xs font-bold text-[#708095]">
          {entry.detail}
        </span>
      </div>
      <span
        aria-hidden="true"
        className={`absolute inset-x-7 bottom-0 h-1 rounded-t-full ${styles[place].floor}`}
      />
    </article>
  );
}

function TopThreePodium({
  board,
  leaderboard,
}: {
  board: LeaderboardBoard;
  leaderboard: LeaderboardData;
}) {
  const podium = leaderboard.entries.slice(0, 3);

  return (
    <section
      aria-labelledby="leaderboard-podium-title"
      className="rounded-[1.75rem] border border-slate-200/90 bg-white/90 p-4 shadow-[0_18px_42px_rgba(16,36,62,.08)] sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[.18em] text-[#087eba]">
            Top 3
          </p>
          <h2
            id="leaderboard-podium-title"
            className="mt-1 text-2xl font-black tracking-tight text-[#10243e] sm:text-3xl"
          >
            {leaderboard.title}
          </h2>
          <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-[#64748b]">
            {leaderboard.subtitle}
          </p>
        </div>
        <RankingPeriodLabel periodLabel={leaderboard.periodLabel} />
      </div>

      {podium.length > 0 ? (
        <div className="mt-6 grid grid-cols-2 items-end gap-3 md:mt-8 md:grid-cols-3 md:gap-4">
          {podium[1] && (
            <PodiumMember board={board} entry={podium[1]} place={2} />
          )}
          {podium[0] && (
            <PodiumMember board={board} entry={podium[0]} place={1} />
          )}
          {podium[2] && (
            <PodiumMember board={board} entry={podium[2]} place={3} />
          )}
        </div>
      ) : (
        <EmptyLeaderboard />
      )}
    </section>
  );
}

function RankingTable({
  board,
  entries,
  currentUserId,
  periodLabel,
}: {
  board: LeaderboardBoard;
  entries: LeaderboardEntry[];
  currentUserId: string;
  periodLabel: string;
}) {
  const detailLabel = detailColumnLabel(board);
  const showTrend = board !== "exam";
  const desktopColumns = showTrend
    ? "md:grid-cols-[3rem_minmax(13rem,1fr)_minmax(8rem,.7fr)_minmax(8rem,.7fr)_minmax(7rem,.55fr)]"
    : "md:grid-cols-[3rem_minmax(13rem,1fr)_minmax(8rem,.7fr)_minmax(8rem,.7fr)]";

  return (
    <section
      aria-labelledby="leaderboard-table-title"
      className="mt-5 overflow-hidden rounded-[1.75rem] border border-slate-200/90 bg-white/90 shadow-[0_18px_42px_rgba(16,36,62,.08)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-6">
        <div>
          <p className="text-xs font-black uppercase tracking-[.18em] text-[#087eba]">
            Top 30
          </p>
          <h2
            id="leaderboard-table-title"
            className="mt-1 text-xl font-black text-[#10243e]"
          >
            Bảng thành tích
          </h2>
        </div>
        <RankingPeriodLabel periodLabel={periodLabel} />
      </div>

      {entries.length > 0 ? (
        <>
          <div className={`hidden items-center gap-4 border-b border-slate-100 bg-slate-50/75 px-6 py-3 text-xs font-black uppercase tracking-[.12em] text-slate-400 md:grid ${desktopColumns}`}>
            <span>#</span>
            <span>Người học</span>
            <span className="text-right">Điểm trung bình</span>
            <span className="text-right">{detailLabel}</span>
            {showTrend && <span className="text-right">Xu hướng</span>}
          </div>
          <div>
            {entries.map((entry) => {
              const topThree = entry.rank <= 3;
              const currentUser = entry.userId === currentUserId;
              const rank = rankPresentation(entry.rank);
              return (
                <article
                  key={entry.userId}
                  className={`grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-slate-100 px-4 py-3.5 transition duration-200 last:border-0 hover:bg-slate-50 sm:px-6 ${desktopColumns} ${
                    currentUser
                      ? "bg-sky-50/85 ring-1 ring-inset ring-sky-100"
                      : topThree
                        ? "bg-amber-50/35"
                        : ""
                  }`}
                >
                  <span
                    aria-label={rank.label}
                    className={`grid h-8 w-8 place-items-center rounded-full text-sm font-black ${
                      entry.rank === 1
                        ? "bg-amber-100 text-amber-800"
                        : entry.rank === 2
                          ? "bg-slate-100 text-slate-600"
                          : entry.rank === 3
                            ? "bg-orange-100 text-orange-800"
                            : "text-slate-500"
                    }`}
                  >
                    {rank.medal ?? entry.rank}
                  </span>
                  <div className="flex min-w-0 items-center gap-3">
                    <LeaderboardAvatar
                      avatarUrl={entry.avatarUrl}
                      displayName={entry.displayName}
                    />
                    <div className="min-w-0">
                      <strong className="block truncate text-sm font-black text-[#1f3652]">
                        {entry.displayName}
                      </strong>
                      <span className="mt-0.5 block text-xs font-semibold text-slate-400">
                        {currentUser ? "Bạn" : "Học viên Harutopik"}
                      </span>
                    </div>
                  </div>
                  <strong className="text-right text-base font-black text-[#087eba] md:text-lg">
                    {displayLeaderboardScore(board, entry)}
                  </strong>
                  <span className="hidden text-right text-sm font-bold text-[#617087] md:block">
                    {entry.detail}
                  </span>
                  {showTrend && (
                    <span className="hidden text-right text-xs font-bold text-slate-400 md:block">
                      — Chưa có dữ liệu
                    </span>
                  )}
                </article>
              );
            })}
          </div>
        </>
      ) : (
        <EmptyLeaderboard compact />
      )}

      {entries.length === 30 && (
        <div className="flex justify-center border-t border-slate-100 px-4 py-4">
          <span className="rounded-xl border border-sky-200 bg-white px-4 py-2.5 text-sm font-black text-[#087eba]">
            Đang hiển thị 30 hạng đầu
          </span>
        </div>
      )}
    </section>
  );
}

function EmptyLeaderboard({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`${compact ? "p-8" : "mt-6 p-8"} text-center sm:p-10`}>
      <span className="grid mx-auto h-14 w-14 place-items-center rounded-2xl bg-sky-50 text-2xl">
        🏁
      </span>
      <h3 className="mt-4 text-lg font-black text-[#10243e]">
        Chưa có người giữ hạng
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-[#64748b]">
        Hãy trở thành người đầu tiên tạo kỷ lục trong bảng xếp hạng này.
      </p>
    </div>
  );
}

function CurrentUserPosition({
  board,
  entry,
}: {
  board: LeaderboardBoard;
  entry: LeaderboardEntry;
}) {
  return (
    <aside className="sticky bottom-4 mt-5 flex items-center justify-between gap-4 rounded-2xl border border-sky-200 bg-[#10243e] px-5 py-4 text-white shadow-[0_18px_40px_rgba(16,36,62,.24)]">
      <div>
        <p className="text-xs font-black uppercase tracking-[.14em] text-cyan-300">
          Vị trí của bạn
        </p>
        <strong className="mt-1 block">
          #{entry.rank} · {entry.detail}
        </strong>
      </div>
      <strong className="text-xl font-black text-cyan-300">
        {displayLeaderboardScore(board, entry)}
      </strong>
    </aside>
  );
}

export function LeaderboardView({
  board,
  leaderboard,
  currentUserId,
}: {
  board: LeaderboardBoard;
  leaderboard: LeaderboardData;
  currentUserId: string;
}) {
  const speedGame = rankedSpeedGames.includes(
    board as (typeof rankedSpeedGames)[number],
  )
    ? (board as (typeof rankedSpeedGames)[number])
    : null;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(105deg,#edf9ff_0%,#ffffff_48%,#fff9e9_100%)] px-4 py-5 text-[#10243e] sm:px-6 sm:py-7">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(8,126,186,.045)_1px,transparent_1px),linear-gradient(90deg,rgba(8,126,186,.045)_1px,transparent_1px)] [background-size:34px_34px]"
      />
      <div className="relative mx-auto max-w-6xl">
        <LeaderboardHero periodLabel={leaderboard.periodLabel} />
        <LeaderboardTabs board={board} />

        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-[#6b7a8e]">
            Thành tích được cập nhật theo chu kỳ xếp hạng hiện tại.
          </p>
          {speedGame && (
            <Link
              href={`/speed-test?game=${rankedSpeedGameDetails[speedGame].query}&ranked=1`}
              className="hidden shrink-0 rounded-xl bg-[#10243e] px-4 py-2.5 text-sm font-black text-white shadow-[0_10px_22px_rgba(16,36,62,.16)] transition hover:-translate-y-0.5 hover:bg-[#087eba] sm:inline-flex"
            >
              Chơi xếp hạng
            </Link>
          )}
        </div>

        <div className="mt-5">
          {leaderboard.entries.length > 0 && (
            <TopThreePodium board={board} leaderboard={leaderboard} />
          )}
          {speedGame && (
            <Link
              href={`/speed-test?game=${rankedSpeedGameDetails[speedGame].query}&ranked=1`}
              className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-[#10243e] px-4 py-3 text-sm font-black text-white shadow-[0_10px_22px_rgba(16,36,62,.16)] sm:hidden"
            >
              Chơi xếp hạng
            </Link>
          )}
          <RankingTable
            board={board}
            entries={leaderboard.entries}
            currentUserId={currentUserId}
            periodLabel={leaderboard.periodLabel}
          />
        </div>

        <p className="mt-5 text-center text-xs font-semibold text-[#7b8797]">
          ⓘ Bảng xếp hạng được cập nhật liên tục theo chu kỳ của từng hạng mục.
        </p>

        {leaderboard.currentUserEntry &&
          leaderboard.currentUserEntry.rank > 30 && (
            <CurrentUserPosition
              board={board}
              entry={leaderboard.currentUserEntry}
            />
          )}
      </div>
    </main>
  );
}
