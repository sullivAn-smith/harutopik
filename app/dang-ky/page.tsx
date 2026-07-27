import type { Metadata } from "next";
import { AuthForm } from "@/features/auth/auth-form";
import { AuthShell } from "@/features/auth/auth-shell";
import { signInWithGoogle, signUp } from "@/features/auth/actions";

export const metadata: Metadata = { title: "Đăng ký" };

export default function SignUpPage() {
  return (
    <AuthShell
      eyebrow="Bắt đầu miễn phí"
      title="Tạo hồ sơ học tập của bạn"
      description="Một tài khoản dùng chung cho website và ứng dụng Harutopik trong tương lai."
    >
      <AuthForm
        mode="sign-up"
        action={signUp}
        googleAction={signInWithGoogle}
      />
    </AuthShell>
  );
}
