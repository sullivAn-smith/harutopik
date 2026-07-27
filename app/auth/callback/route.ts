import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextPath = url.searchParams.get("next");
  const safeNext =
    nextPath?.startsWith("/") && !nextPath.startsWith("//")
      ? nextPath
      : null;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const [{ data: profile }, { data: roleRows }] = user
        ? await Promise.all([
            supabase
            .from("learner_profiles")
            .select("onboarding_completed")
            .eq("id", user.id)
            .maybeSingle(),
            supabase.from("user_roles").select("role").eq("user_id", user.id),
          ])
        : [{ data: null }, { data: [] }];
      const assignedRoles = (roleRows ?? []).map((row) => row.role);
      const roleHome = assignedRoles.includes("admin")
        ? "/quan-tri"
        : assignedRoles.includes("content_editor")
          ? "/bien-tap"
          : "/tai-khoan";
      const destination = profile?.onboarding_completed
        ? safeNext ?? roleHome
        : "/bat-dau";
      return NextResponse.redirect(new URL(destination, url.origin));
    }
  }

  return NextResponse.redirect(
    new URL("/dang-nhap?error=callback", url.origin),
  );
}
