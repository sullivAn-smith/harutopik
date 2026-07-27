export type Entitlement = {
  key: string;
  status: "active" | "expired" | "revoked";
  startsAt: string;
  endsAt: string | null;
};

export function isEntitlementActive(
  entitlement: Entitlement | null,
  now = new Date(),
) {
  if (!entitlement || entitlement.status !== "active") return false;
  const startsAt = new Date(entitlement.startsAt);
  const endsAt = entitlement.endsAt ? new Date(entitlement.endsAt) : null;
  return startsAt <= now && (!endsAt || endsAt > now);
}

export function canAccessPremium(
  entitlements: readonly Entitlement[],
  now = new Date(),
) {
  return entitlements.some(
    (entitlement) =>
      entitlement.key === "premium_content" &&
      isEntitlementActive(entitlement, now),
  );
}
