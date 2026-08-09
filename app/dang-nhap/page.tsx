import type { Metadata } from "next";
import { AuthForm } from "@/features/auth/auth-form";
import { AuthShell } from "@/features/auth/auth-shell";
import { signIn, signInWithGoogle } from "@/features/auth/actions";

export const metadata: Metadata = { title: "Đăng nhập" };

const oauthMessages: Record<string, string> = {
  callback:
    "Google chưa thể hoàn tất đăng nhập. Vui lòng thử lại hoặc dùng email.",
  google:
    "Không thể bắt đầu đăng nhập Google. Vui lòng thử lại sau.",
  "not-configured":
    "Supabase chưa được cấu hình nên đăng nhập Google chưa khả dụng.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const query = await searchParams;
  const error = query.error;
  const nextPath = query.next?.startsWith("/") && !query.next.startsWith("//") ? query.next : "";

  return (
    <AuthShell
      eyebrow="Chào mừng trở lại"
      title="Tiếp tục hành trình tiếng Hàn"
      description="Đăng nhập để đồng bộ tiến độ, chuỗi ngày học và lịch ôn tập trên mọi thiết bị."
    >
      <AuthForm
        mode="sign-in"
        action={signIn.bind(null, nextPath)}
        googleAction={signInWithGoogle.bind(null, nextPath)}
        nextPath={nextPath}
        oauthMessage={error ? oauthMessages[error] : undefined}
      />
    </AuthShell>
  );
}
