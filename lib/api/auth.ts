import "server-only";

import {
  createClient as createSupabaseClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";
import { getSupabaseConfig, isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient as createCookieClient } from "@/lib/supabase/server";

export type ApiActor = {
  user: User;
  supabase: SupabaseClient;
  authentication: "bearer" | "cookie";
};

export async function getApiActor(request: Request): Promise<ApiActor | null> {
  if (!isSupabaseConfigured()) return null;

  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    const token = authorization.slice("Bearer ".length).trim();
    if (!token) return null;
    const { supabaseUrl, supabasePublishableKey } = getSupabaseConfig();
    const supabase = createSupabaseClient(
      supabaseUrl,
      supabasePublishableKey,
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);
    return error || !user
      ? null
      : { user, supabase, authentication: "bearer" };
  }

  const supabase = await createCookieClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { user, supabase, authentication: "cookie" } : null;
}
