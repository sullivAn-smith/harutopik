"use server";

import { redirect } from "next/navigation";
import {
  type AuthFormState,
  signInSchema,
  signUpSchema,
} from "@/lib/auth/schema";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const notConfigured: AuthFormState = {
  status: "error",
  message:
    "Hệ thống tài khoản đang chờ kết nối Supabase. Nội dung học vẫn dùng được bình thường.",
};

function formValues(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

async function getPostAuthPath(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "/tai-khoan";
  const [{ data: profile }, { data: roleRows }] = await Promise.all([
    supabase
    .from("learner_profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
  ]);
  if (!profile?.onboarding_completed) return "/bat-dau";
  const assignedRoles = (roleRows ?? []).map((row) => row.role);
  if (assignedRoles.includes("admin")) return "/quan-tri";
  if (assignedRoles.includes("content_editor")) return "/bien-tap";
  return "/tai-khoan";
}

export async function signIn(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signInSchema.safeParse(formValues(formData));
  if (!parsed.success) {
    return {
      status: "error",
      fields: parsed.error.flatten().fieldErrors,
    };
  }
  if (!isSupabaseConfigured()) return notConfigured;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return {
      status: "error",
      message: "Email hoặc mật khẩu chưa đúng.",
    };
  }

  redirect(await getPostAuthPath(supabase));
}

export async function signUp(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signUpSchema.safeParse(formValues(formData));
  if (!parsed.success) {
    return {
      status: "error",
      fields: parsed.error.flatten().fieldErrors,
    };
  }
  if (!isSupabaseConfigured()) return notConfigured;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.displayName },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`,
    },
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  if (data.session) redirect(await getPostAuthPath(supabase));
  return {
    status: "success",
    message: "Hãy kiểm tra email để xác nhận tài khoản Harutopik.",
  };
}

export async function signInWithGoogle() {
  if (!isSupabaseConfigured()) {
    redirect("/dang-nhap?error=not-configured");
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${siteUrl}/auth/callback`,
    },
  });

  if (error || !data.url) {
    redirect("/dang-nhap?error=google");
  }

  redirect(data.url);
}

export async function signOut() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}
