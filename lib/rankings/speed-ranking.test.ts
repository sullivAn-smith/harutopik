import { describe, expect, it } from "vitest";

import {
  rankedSpeedGameFromQuery,
  vietnamWeekStart,
} from "./speed-ranking";

describe("ranked Speed Test helpers", () => {
  it("maps public query names to stored game types", () => {
    expect(rankedSpeedGameFromQuery("typing")).toBe("typing_sprint");
    expect(rankedSpeedGameFromQuery("audio")).toBe("audio_reaction");
    expect(rankedSpeedGameFromQuery("flash")).toBe("flash_reaction");
    expect(rankedSpeedGameFromQuery("card")).toBe("card_reaction");
    expect(rankedSpeedGameFromQuery("unknown")).toBeNull();
  });

  it("uses Monday as the weekly ranking boundary in Vietnam", () => {
    expect(vietnamWeekStart(new Date("2026-08-17T12:00:00+07:00"))).toBe(
      "2026-08-17",
    );
    expect(vietnamWeekStart(new Date("2026-08-23T23:59:00+07:00"))).toBe(
      "2026-08-17",
    );
  });
});
