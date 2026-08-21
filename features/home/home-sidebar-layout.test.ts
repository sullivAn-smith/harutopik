import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("./home-client.tsx", import.meta.url),
  "utf8",
);

describe("desktop home sidebar layout", () => {
  it("starts the navigation below the logo without the Học tập badge", () => {
    expect(source).not.toContain(">Học tập</p>");
    expect(source).toContain('<nav className="mt-6 min-h-0 flex-1');
  });

  it("keeps the account action anchored at the bottom and hides upgrade entry points", () => {
    expect(source).toContain('<div className="mt-auto space-y-3">');
    expect(source).not.toContain('href="/nang-cap"');
  });

  it("shows the learner leaderboard in the left navigation", () => {
    expect(source).toContain(
      'href="/bang-xep-hang" prefetch={rankingPrefetchReady}',
    );
    expect(source).toContain("<span>Bảng xếp hạng</span>");
  });
});
