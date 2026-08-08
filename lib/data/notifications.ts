import "server-only";

import { getCurrentActor } from "@/lib/auth/authorize";
import { createClient } from "@/lib/supabase/server";

export type LearnerStreakReminder = {
  id: string;
  title: string;
  message: string;
  href: string | null;
  createdAt: string;
};

export type HomeNotificationSummary = {
  unreadCount: number;
  streakReminder: LearnerStreakReminder | null;
};

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

export async function getHomeNotificationSummary(): Promise<HomeNotificationSummary> {
  const actor = await getCurrentActor();
  if (!actor) return { unreadCount: 0, streakReminder: null };

  const supabase = await createClient();
  const [unreadResult, reminderResult] = await Promise.all([
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", actor.id)
      .is("read_at", null),
    supabase
      .from("notifications")
      .select("id,title,message,href,created_at")
      .eq("user_id", actor.id)
      .eq("type", "streak_reminder")
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const reminder = reminderResult.data;
  return {
    unreadCount: unreadResult.count ?? 0,
    streakReminder: reminder
      ? {
          id: reminder.id,
          title: reminder.title,
          message: reminder.message,
          href: reminder.href,
          createdAt: reminder.created_at,
        }
      : null,
  };
}
