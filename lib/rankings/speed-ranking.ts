export const rankedSpeedGames = [
  "typing_sprint",
  "audio_reaction",
  "flash_reaction",
  "card_reaction",
] as const;

export type RankedSpeedGame = (typeof rankedSpeedGames)[number];
export type RankedSpeedGameQuery = "typing" | "audio" | "flash" | "card";

export const rankedSpeedGameDetails: Record<
  RankedSpeedGame,
  {
    query: RankedSpeedGameQuery;
    label: string;
    shortLabel: string;
    icon: string;
    config: string;
  }
> = {
  typing_sprint: {
    query: "typing",
    label: "Typing Sprint",
    shortLabel: "Typing",
    icon: "⌨",
    config: "20 từ · 60 giây · Hàn → Việt",
  },
  audio_reaction: {
    query: "audio",
    label: "Audio Reaction",
    shortLabel: "Audio",
    icon: "◉",
    config: "10 câu · Chọn đáp án",
  },
  flash_reaction: {
    query: "flash",
    label: "Flash Recall",
    shortLabel: "Flash",
    icon: "◇",
    config: "20 câu · Mức vừa · Hai chiều",
  },
  card_reaction: {
    query: "card",
    label: "Card Reaction",
    shortLabel: "Card",
    icon: "▦",
    config: "16 thẻ · Mức vừa · Hai chiều",
  },
};

export function rankedSpeedGameFromQuery(
  value: string | undefined,
): RankedSpeedGame | null {
  return rankedSpeedGames.find(
    (game) => rankedSpeedGameDetails[game].query === value,
  ) ?? null;
}

export function vietnamDateParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    weekday: value("weekday"),
  };
}

export function vietnamWeekStart(now = new Date()) {
  const { date } = vietnamDateParts(now);
  const utcDate = new Date(`${date}T00:00:00Z`);
  const isoDay = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() - isoDay + 1);
  return utcDate.toISOString().slice(0, 10);
}

