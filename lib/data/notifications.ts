import "server-only";

import { getCurrentActor } from "@/lib/auth/authorize";
import { createClient } from "@/lib/supabase/server";

export async function getNotifications(limit = 30) {
  const actor = await getCurrentActor();
  if (!actor) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id,type,title,message,href,read_at,created_at")
    .eq("user_id", actor.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getUnreadNotificationCount() {
  const actor = await getCurrentActor();
  if (!actor) return 0;
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", actor.id)
    .is("read_at", null);
  return count ?? 0;
}
