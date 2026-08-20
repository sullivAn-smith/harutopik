import { getApiActor } from "@/lib/api/auth";
import {
  apiBackendError,
  apiError,
  apiSuccess,
} from "@/lib/api/responses";
import { getLeaderboardSnapshot } from "@/lib/data/rankings";

export async function GET(request: Request) {
  const actor = await getApiActor(request);
  if (!actor) return apiError("UNAUTHENTICATED", "Bạn cần đăng nhập.", 401);

  try {
    const snapshot = await getLeaderboardSnapshot(actor.user.id);
    return apiSuccess(snapshot, { cacheControl: "private, no-store" });
  } catch (error) {
    return apiBackendError(error, "Chưa thể làm mới bảng xếp hạng.");
  }
}
