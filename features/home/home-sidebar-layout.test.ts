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

  it("keeps the upgrade and account actions anchored at the bottom", () => {
    expect(source).toContain('<div className="mt-auto space-y-3">');
  });
});
