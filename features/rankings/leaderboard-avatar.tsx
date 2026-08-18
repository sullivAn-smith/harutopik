"use client";

import { useState } from "react";

export function LeaderboardAvatar({
  avatarUrl,
  displayName,
  size,
  featured = false,
}: {
  avatarUrl: string | null;
  displayName: string;
  size?: "row" | "podium" | "champion";
  featured?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const avatarSize = size ?? (featured ? "champion" : "row");
  const dimensions = {
    row: "h-10 w-10 text-sm ring-1 shadow-sm",
    podium: "h-16 w-16 text-2xl ring-2 shadow-md",
    champion: "h-20 w-20 text-3xl ring-4 shadow-lg",
  }[avatarSize];

  if (avatarUrl && !failed) {
    return (
      // Avatar URLs come from the learner's authenticated profile.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={`Ảnh đại diện của ${displayName}`}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={`${dimensions} shrink-0 rounded-full object-cover ring-white`}
      />
    );
  }

  return (
    <span
      className={`${dimensions} grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-cyan-300 via-sky-500 to-indigo-600 font-black text-white ring-white`}
      aria-label={`Ảnh đại diện mặc định của ${displayName}`}
    >
      {displayName.charAt(0).toLocaleUpperCase("vi")}
    </span>
  );
}
