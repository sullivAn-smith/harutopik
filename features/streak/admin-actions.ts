"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/authorize";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function numberField(formData: FormData, name: string) {
  const value = Number(formData.get(name));
  return Number.isFinite(value) ? value : Number.NaN;
}

function returnTo(status: string, message?: string): never {
  const params = new URLSearchParams({ status });
  if (message) params.set("message", message);
  redirect(`/quan-tri/streak?${params.toString()}`);
}

export async function updateStreakSettings(formData: FormData) {
  await requirePermission("role:assign");
  const interval = numberField(formData, "interval");
  const amount = numberField(formData, "amount");
  const maxShields = numberField(formData, "maxShields");
  const reminderHour = numberField(formData, "reminderHour");
  const reminderEnabled = formData.get("reminderEnabled") === "on";
  if (
    !Number.isInteger(interval) || interval < 1 || interval > 365 ||
    !Number.isInteger(amount) || amount < 1 || amount > 100 ||
    !Number.isInteger(maxShields) || maxShields < 0 || maxShields > 1000 ||
    !Number.isInteger(reminderHour) || reminderHour < 0 || reminderHour > 23
  ) returnTo("error", "Quy tắc streak chưa hợp lệ.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_streak_settings", {
    p_interval: interval,
    p_reward_amount: amount,
    p_max_shields: maxShields,
    p_reminder_enabled: reminderEnabled,
    p_reminder_hour: reminderHour,
  });
  if (error) returnTo("error", "Không thể lưu quy tắc streak.");
  revalidatePath("/quan-tri/streak");
  returnTo("settings-saved");
}

async function allUserIds() {
  const admin = createAdminClient();
  const ids: string[] = [];
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    ids.push(...data.users.map((user) => user.id));
    if (data.users.length < 1000) break;
    page += 1;
  }
  return ids;
}

export async function grantStreakShields(formData: FormData) {
  await requirePermission("role:assign");
  const scope = formData.get("scope");
  const amount = numberField(formData, "amount");
  const reason = String(formData.get("reason") ?? "").trim();
  let userIds = formData.getAll("userIds").filter((value): value is string => typeof value === "string");
  if (!Number.isInteger(amount) || amount < 1 || amount > 100 || reason.length < 3) {
    returnTo("error", "Nhập số khiên và lý do hợp lệ.");
  }
  if (scope === "all") {
    try {
      userIds = await allUserIds();
    } catch {
      returnTo("error", "Không thể tải toàn bộ tài khoản.");
    }
  }
  userIds = [...new Set(userIds)];
  if (userIds.length === 0) returnTo("error", "Hãy chọn ít nhất một tài khoản.");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_grant_streak_shields", {
    p_user_ids: userIds,
    p_amount: amount,
    p_reason: reason,
  });
  if (error) returnTo("error", "Không thể tặng khiên.");
  revalidatePath("/quan-tri/streak");
  returnTo("shields-granted", `Đã tặng khiên cho ${data ?? userIds.length} tài khoản.`);
}
