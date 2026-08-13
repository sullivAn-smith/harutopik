import { describe, expect, it } from "vitest";
import { getDailyBestAccuracy, getVietnamChallengeDate } from "./daily";

describe("daily speed challenge", () => {
  it("xác định ngày thử thách theo múi giờ Việt Nam", () => {
    expect(getVietnamChallengeDate(new Date("2026-08-13T18:30:00.000Z"))).toBe("2026-08-14");
  });

  it("lấy accuracy tốt nhất trong các lượt làm lại", () => {
    expect(getDailyBestAccuracy([{ accuracy: "80.5" }, { accuracy: 95 }])).toBe(95);
    expect(getDailyBestAccuracy([])).toBeUndefined();
  });
});
