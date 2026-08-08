"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentActor } from "@/lib/auth/authorize";
import { createClient } from "@/lib/supabase/server";

export async function markNotificationRead(formData: FormData) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/dang-nhap");
  const notificationId = formData.get("notificationId");
  const href = formData.get("href");
  if (typeof notificationId !== "string") redirect("/thong-bao");
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", actor.id);
  revalidatePath("/thong-bao");
  redirect(typeof href === "string" && href.startsWith("/") ? href : "/thong-bao");
}

export async function markAllNotificationsRead() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/dang-nhap");
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", actor.id)
    .is("read_at", null);
  revalidatePath("/thong-bao");
}

export async function acknowledgeNotification(notificationId: string) {
  const actor = await getCurrentActor();
  if (!actor) return { ok: false as const, error: "Bạn cần đăng nhập." };
  if (!/^[0-9a-f-]{36}$/i.test(notificationId)) {
    return { ok: false as const, error: "Thông báo không hợp lệ." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", actor.id)
    .is("read_at", null);

  if (error) {
    console.error("[notifications] Could not acknowledge notification", {
      notificationId,
      userId: actor.id,
      message: error.message,
    });
    return { ok: false as const, error: "Chưa thể cập nhật thông báo." };
  }

  revalidatePath("/");
  revalidatePath("/thong-bao");
  return { ok: true as const };
}

export async function clearAllNotifications() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/dang-nhap");
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("user_id", actor.id);
  if (error) redirect("/thong-bao?clear=error");
  revalidatePath("/thong-bao");
  redirect("/thong-bao?clear=done");
}
