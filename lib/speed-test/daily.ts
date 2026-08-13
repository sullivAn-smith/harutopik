export function getVietnamChallengeDate(value = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

export function getDailyBestAccuracy(rows: readonly { accuracy: number | string }[]) {
  if (!rows.length) return undefined;
  return Math.max(...rows.map((row) => Number(row.accuracy)));
}
