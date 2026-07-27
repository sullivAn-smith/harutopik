import "server-only";

import { cache } from "react";
import { getCurrentActor } from "@/lib/auth/authorize";
import { canAccessPremium, type Entitlement } from "@/lib/billing/entitlements";
import { createClient } from "@/lib/supabase/server";

export const getOwnEntitlementSummary = cache(async () => {
  const actor = await getCurrentActor();
  if (!actor) return { isPro: false, entitlements: [] as Entitlement[] };

  const supabase = await createClient();
  const { data } = await supabase
    .from("entitlements")
    .select("entitlement_key,status,starts_at,ends_at")
    .eq("user_id", actor.id);
  const entitlements: Entitlement[] = (data ?? []).map((item) => ({
    key: item.entitlement_key,
    status: item.status,
    startsAt: item.starts_at,
    endsAt: item.ends_at,
  }));

  return { isPro: canAccessPremium(entitlements), entitlements };
});
