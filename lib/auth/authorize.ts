import "server-only";

import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import {
  hasPermission,
  roles,
  type AppRole,
  type Permission,
} from "./permissions";

export const getCurrentActor = cache(async () => {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  const assignedRoles = (data ?? [])
    .map(({ role }) => role)
    .filter((role): role is AppRole => roles.includes(role as AppRole));

  return {
    id: user.id,
    email: user.email ?? "",
    roles: assignedRoles.length > 0 ? assignedRoles : ["learner" as const],
  };
});

export async function requirePermission(permission: Permission) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/dang-nhap?next=/quan-tri");
  if (!hasPermission(actor.roles, permission)) notFound();
  return actor;
}
