import { describe, expect, it } from "vitest";
import { canAccessPremium, isEntitlementActive } from "./entitlements";

const now = new Date("2026-07-24T00:00:00.000Z");

describe("entitlements", () => {
  it("cho phép quyền đang hoạt động trong thời hạn", () => {
    expect(
      isEntitlementActive(
        {
          key: "premium_content",
          status: "active",
          startsAt: "2026-01-01T00:00:00.000Z",
          endsAt: "2027-01-01T00:00:00.000Z",
        },
        now,
      ),
    ).toBe(true);
  });

  it("từ chối quyền hết hạn hoặc bị thu hồi", () => {
    expect(
      canAccessPremium(
        [
          {
            key: "premium_content",
            status: "expired",
            startsAt: "2025-01-01T00:00:00.000Z",
            endsAt: "2026-01-01T00:00:00.000Z",
          },
        ],
        now,
      ),
    ).toBe(false);
  });
});
