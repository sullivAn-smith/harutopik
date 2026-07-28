"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/authorize";
import { roles, type AppRole } from "@/lib/auth/permissions";
import { toUserFacingError } from "@/lib/errors/user-facing";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const manageableRoles = ["learner", "content_editor", "admin"] as const;

export async function changePrimaryRole(formData: FormData) {
  await requirePermission("role:assign");
  const userId = formData.get("userId");
  const role = formData.get("role");
  const reason = formData.get("reason");
  if (
    typeof userId !== "string" ||
    typeof role !== "string" ||
    !roles.includes(role as AppRole) ||
    !manageableRoles.includes(role as (typeof manageableRoles)[number]) ||
    typeof reason !== "string" ||
    reason.trim().length < 3
  ) {
    redirect(`/quan-tri/tai-khoan/${userId}?role=invalid`);
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_user_primary_role", {
    p_user_id: userId,
    p_role: role,
    p_reason: reason.trim(),
  });
  if (error) {
    const friendly = toUserFacingError(error, "Không thể thay đổi role.");
    redirect(`/quan-tri/tai-khoan/${userId}?role=error&errorMessage=${encodeURIComponent(friendly.message)}`);
  }
  revalidatePath("/quan-tri/tai-khoan");
  redirect(`/quan-tri/tai-khoan/${userId}?role=updated`);
}

export async function setAccountLock(formData: FormData) {
  const actor = await requirePermission("role:assign");
  const userId = formData.get("userId");
  const action = formData.get("action");
  const reason = formData.get("reason");
  if (
    typeof userId !== "string" ||
    (action !== "lock" && action !== "unlock") ||
    typeof reason !== "string" ||
    reason.trim().length < 3
  ) {
    redirect(`/quan-tri/tai-khoan/${userId}?lock=invalid`);
  }
  if (userId === actor.id && action === "lock") {
    redirect(`/quan-tri/tai-khoan/${userId}?lock=self`);
  }
  const admin = createAdminClient();
  const { error: authError } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: action === "lock" ? "876000h" : "none",
  });
  if (authError) {
    redirect(`/quan-tri/tai-khoan/${userId}?lock=error`);
  }
  const { error } = await admin.from("account_management").upsert({
    user_id: userId,
    is_locked: action === "lock",
    locked_at: action === "lock" ? new Date().toISOString() : null,
    locked_by: actor.id,
    lock_reason: reason.trim(),
    updated_at: new Date().toISOString(),
  });
  if (error) {
    await admin.auth.admin.updateUserById(userId, {
      ban_duration: action === "lock" ? "none" : "876000h",
    });
    redirect(`/quan-tri/tai-khoan/${userId}?lock=error`);
  }
  revalidatePath("/quan-tri/tai-khoan");
  redirect(`/quan-tri/tai-khoan/${userId}?lock=${action === "lock" ? "locked" : "unlocked"}`);
}
