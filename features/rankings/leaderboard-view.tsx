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
  if (board === "exam") return `${entry.score.toLocaleString("vi-VN")} điểm`;
  if (board === "current_streak" || board === "longest_streak") {
    return `${entry.score} ngày`;
  }
  return entry.score.toLocaleString("vi-VN");
}

function detailColumnLabel(board: LeaderboardBoard) {
  return board === "exam" ? "Đề · thời gian" : "Thành tích";
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
    <header className="relative overflow-hidden rounded-[1.75rem] border border-sky-300/20 bg-[radial-gradient(circle_at_72%_-25%,rgba(34,211,238,.28),transparent_38%),linear-gradient(125deg,#0b2340_0%,#0c4f7f_58%,#087eba_100%)] px-5 py-4 text-white shadow-[0_22px_54px_rgba(8,70,120,.2)] sm:px-8">
      <span aria-hidden="true" className="absolute -bottom-20 -left-12 h-44 w-44 rounded-full border-[28px] border-white/5" />
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/"
          className="relative inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-2 text-sm font-black text-white shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/18"
        >
          <span aria-hidden="true">←</span>
          Trang chủ
        </Link>
        <span className="relative inline-flex items-center gap-1.5 rounded-full border border-amber-200/70 bg-amber-100/95 px-3 py-2 text-xs font-black text-amber-900 shadow-sm">
          <span aria-hidden="true">🔥</span>
          {periodLabel}
        </span>
      </div>

      <div className="mx-auto -mt-1 max-w-2xl text-center sm:-mt-3">
        <p className="text-[.68rem] font-black uppercase tracking-[.28em] text-cyan-200">
          Harutopik League
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-[-.045em] text-white sm:text-4xl">
          Bảng xếp hạng
        </h1>
        <p className="mt-1 text-sm font-semibold leading-5 text-blue-100 sm:text-base">
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
      className="mt-4 flex gap-1.5 overflow-x-auto rounded-2xl border border-white/80 bg-white/72 p-1.5 shadow-[0_12px_30px_rgba(8,70,120,.09)] backdrop-blur-xl sm:justify-center"
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
                ? "bg-gradient-to-r from-[#075f98] to-[#12a4d3] text-white shadow-[0_8px_20px_rgba(8,126,186,.26)]"
                : "text-[#52667f] hover:bg-sky-50/90 hover:text-[#075f98]"
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
  const score = displayLeaderboardScore(board, entry);
  const showDetail = entry.detail.trim() !== score;
  const styles = {
    1: {
      card: "order-1 col-span-2 min-h-[13rem] border-amber-200 bg-[radial-gradient(circle_at_50%_0%,rgba(253,230,138,.72),transparent_58%),linear-gradient(180deg,#fffdf4,#fff)] shadow-[0_16px_34px_rgba(190,130,16,.14)] md:order-2 md:col-span-1 md:-translate-y-2",
      avatar: "bg-gradient-to-br from-amber-200 via-yellow-50 to-amber-400 p-1 shadow-[0_8px_18px_rgba(190,130,16,.2)]",
      label: "bg-amber-100 text-amber-900",
      score: "border-amber-100 bg-white/80",
      floor: "bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300",
    },
    2: {
      card: "order-2 min-h-[11.5rem] border-slate-200 bg-[radial-gradient(circle_at_50%_0%,rgba(226,232,240,.72),transparent_58%),linear-gradient(180deg,#f8fafc,#fff)] md:order-1 md:mb-1",
      avatar: "bg-gradient-to-br from-slate-200 via-white to-slate-400 p-0.5 shadow-[0_6px_14px_rgba(71,85,105,.14)]",
      label: "bg-slate-100 text-slate-700",
      score: "border-slate-100 bg-white/80",
      floor: "bg-gradient-to-r from-slate-300 via-slate-400 to-slate-300",
    },
    3: {
      card: "order-3 min-h-[11.5rem] border-orange-200 bg-[radial-gradient(circle_at_50%_0%,rgba(254,215,170,.68),transparent_58%),linear-gradient(180deg,#fff7ed,#fff)]",
      avatar: "bg-gradient-to-br from-orange-200 via-orange-50 to-orange-400 p-0.5 shadow-[0_6px_14px_rgba(194,65,12,.15)]",
      label: "bg-orange-100 text-orange-800",
      score: "border-orange-100 bg-white/80",
      floor: "bg-gradient-to-r from-orange-300 via-orange-400 to-orange-300",
    },
  };
  const rank = rankPresentation(place);
  const title = place === 1 ? "Dẫn đầu bảng" : `Hạng ${place}`;

  return (
    <article
      className={`relative flex flex-col items-center justify-center overflow-hidden rounded-[1.35rem] border px-3 py-4 text-center ${styles[place].card}`}
    >
      <span
        aria-hidden="true"
        className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/55 blur-2xl"
      />
      <span
        className={`absolute left-3 top-3 grid h-7 w-7 place-items-center rounded-full text-base ${
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
          className="absolute right-3 top-3 text-lg text-amber-500"
        >
          ♛
        </span>
      )}
      <div className={`relative rounded-full ${styles[place].avatar}`}>
        <LeaderboardAvatar
          avatarUrl={entry.avatarUrl}
          displayName={entry.displayName}
          size={featured ? "podium" : "row"}
        />
      </div>
      <span className={`mt-2 rounded-full px-2.5 py-0.5 text-[.62rem] font-black uppercase tracking-[.12em] ${styles[place].label}`}>
        {title}
      </span>
      <h3 className="mt-1.5 max-w-full truncate text-base font-black text-[#10243e]">
        {entry.displayName}
      </h3>
      <div className={`mt-2 rounded-xl border px-3 py-1.5 ${styles[place].score}`}>
        <strong
          className={`block font-black tracking-tight ${
            featured
              ? "text-2xl text-[#087eba]"
              : "text-xl text-[#245d93]"
          }`}
        >
          {score}
        </strong>
        {showDetail && <span className="mt-0.5 block max-w-48 truncate text-[.68rem] font-bold text-[#708095]">{entry.detail}</span>}
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
      className="rounded-[1.5rem] border border-white/90 bg-white/82 p-4 shadow-[0_18px_46px_rgba(8,70,120,.1)] backdrop-blur-xl"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[.18em] text-[#087eba]">
            Top 3
          </p>
          <h2
            id="leaderboard-podium-title"
            className="mt-0.5 text-xl font-black tracking-tight text-[#10243e] sm:text-2xl"
          >
            {leaderboard.title}
          </h2>
          <p className="mt-0.5 max-w-2xl text-sm font-semibold leading-5 text-[#64748b]">
            {leaderboard.subtitle}
          </p>
        </div>
        <RankingPeriodLabel periodLabel={leaderboard.periodLabel} />
      </div>

      {podium.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 items-end gap-3 md:grid-cols-3">
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
  const desktopColumns = "md:grid-cols-[3rem_minmax(13rem,1fr)_minmax(8rem,.7fr)_minmax(8rem,.7fr)]";

  return (
    <section
      aria-labelledby="leaderboard-table-title"
      className="mt-5 overflow-hidden rounded-[1.75rem] border border-white/90 bg-white/84 shadow-[0_18px_46px_rgba(8,70,120,.1)] backdrop-blur-xl"
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
            <span className="text-right">{board === "exam" ? "Tổng điểm" : "Điểm"}</span>
            <span className="text-right">{detailLabel}</span>
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
  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_8%_12%,rgba(56,189,248,.16),transparent_28rem),radial-gradient(circle_at_92%_18%,rgba(251,191,36,.13),transparent_26rem),linear-gradient(135deg,#edf8ff_0%,#f8fbff_48%,#fff8ea_100%)] px-4 py-5 text-[#10243e] sm:px-6 sm:py-7">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(8,126,186,.055)_1px,transparent_1px),linear-gradient(90deg,rgba(8,126,186,.055)_1px,transparent_1px)] [background-size:36px_36px]"
      />
      <div className="relative mx-auto max-w-6xl">
        <LeaderboardHero periodLabel={leaderboard.periodLabel} />
        <LeaderboardTabs board={board} />

        <div className="mt-5 flex items-center gap-3">
          <p className="text-sm font-bold text-[#526b86]">
            {board === "exam"
              ? "Mỗi đề lấy kết quả tốt nhất, sau đó cộng tổng điểm và tổng thời gian."
              : "Mọi lượt chơi được tự động cập nhật; hệ thống giữ thành tích tốt nhất trong tuần."}
          </p>
        </div>

        <div className="mt-5">
          {leaderboard.entries.length > 0 && (
            <TopThreePodium board={board} leaderboard={leaderboard} />
          )}
          <RankingTable
            board={board}
            entries={leaderboard.entries}
            currentUserId={currentUserId}
            periodLabel={leaderboard.periodLabel}
          />
        </div>

        <p className="mt-5 text-center text-xs font-semibold text-[#7b8797]">
          ⓘ Bảng cập nhật hằng ngày và làm mới mỗi tuần.
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
