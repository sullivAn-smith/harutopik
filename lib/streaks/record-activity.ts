import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type StreakActivitySource = "lesson" | "review" | "exam";

export async function recordStreakActivity(input: {
  userId: string;
  completedAt: string;
  sourceType: StreakActivitySource;
  sourceId?: string | null;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("record_streak_activity", {
    p_user_id: input.userId,
    p_completed_at: input.completedAt,
    p_source_type: input.sourceType,
    p_source_id: input.sourceId ?? null,
  });
  if (error) {
    console.error("[streak] record activity failed", {
      userId: input.userId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      code: error.code,
      message: error.message,
    });
    return null;
  }
  return data;
}
