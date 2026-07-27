import { apiError, apiSuccess } from "@/lib/api/responses";
import { getApiActor } from "@/lib/api/auth";
import { canAccessPremium, type Entitlement } from "@/lib/billing/entitlements";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return apiError(
      "AUTH_NOT_CONFIGURED",
      "Hệ thống tài khoản chưa được cấu hình.",
      503,
    );
  }
  const actor = await getApiActor(request);
  if (!actor) {
    return apiError("UNAUTHENTICATED", "Bạn cần đăng nhập.", 401);
  }
  const { data, error } = await actor.supabase
    .from("entitlements")
    .select("entitlement_key,status,starts_at,ends_at")
    .eq("user_id", actor.user.id);
  if (error) {
    return apiError("DATABASE_ERROR", "Không thể tải quyền truy cập.", 500);
  }

  const entitlements: Entitlement[] = (data ?? []).map((item) => ({
    key: item.entitlement_key,
    status: item.status,
    startsAt: item.starts_at,
    endsAt: item.ends_at,
  }));
  return apiSuccess({
    premium: canAccessPremium(entitlements),
    entitlements,
  });
}
