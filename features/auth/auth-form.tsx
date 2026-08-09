"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  initialAuthFormState,
  type AuthFormState,
} from "@/lib/auth/schema";

type AuthAction = (
  state: AuthFormState,
  formData: FormData,
) => Promise<AuthFormState>;

type AuthFormProps = {
  mode: "sign-in" | "sign-up";
  action: AuthAction;
  googleAction: () => Promise<void>;
  oauthMessage?: string;
  nextPath?: string;
};

function FieldError({
  state,
  name,
}: {
  state: AuthFormState;
  name: string;
}) {
  const message = state.fields?.[name]?.[0];
  return message ? (
    <p id={`${name}-error`} className="mt-1 text-sm font-semibold text-red-700">
      {message}
    </p>
  ) : null;
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.91h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.4Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.98-.9 6.63-2.37l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.39 13.92A6.02 6.02 0 0 1 6.07 12c0-.67.12-1.32.32-1.92V7.46H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.54l3.35-2.62Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.95c1.47 0 2.79.5 3.82 1.5l2.88-2.87A9.65 9.65 0 0 0 12 2a10 10 0 0 0-8.96 5.46l3.35 2.62C7.18 7.71 9.39 5.95 12 5.95Z"
      />
    </svg>
  );
}

export function AuthForm({
  mode,
  action,
  googleAction,
  oauthMessage,
  nextPath = "",
}: AuthFormProps) {
  const [state, formAction, pending] = useActionState(
    action,
    initialAuthFormState,
  );
  const isSignUp = mode === "sign-up";

  return (
    <div className="mt-8">
      {oauthMessage && (
        <p
          role="alert"
          className="mb-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900"
        >
          {oauthMessage}
        </p>
      )}

      <form action={googleAction}>
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 font-black text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-100"
        >
          <GoogleIcon />
          {isSignUp ? "Đăng ký bằng Google" : "Tiếp tục với Google"}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-slate-200" />
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          hoặc dùng email
        </span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <form action={formAction} className="space-y-5" noValidate>
      {isSignUp && (
        <label className="block font-bold text-slate-800">
          Tên hiển thị
          <input
            name="displayName"
            autoComplete="name"
            aria-describedby="displayName-error"
            className="mt-2 w-full rounded-2xl border bg-white px-4 py-3 font-medium outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-sky-100"
            placeholder="Ví dụ: Minh Anh"
          />
          <FieldError state={state} name="displayName" />
        </label>
      )}

      <label className="block font-bold text-slate-800">
        Email
        <input
          name="email"
          type="email"
          autoComplete="email"
          aria-describedby="email-error"
          className="mt-2 w-full rounded-2xl border bg-white px-4 py-3 font-medium outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-sky-100"
          placeholder="ban@email.com"
        />
        <FieldError state={state} name="email" />
      </label>

      <label className="block font-bold text-slate-800">
        Mật khẩu
        <input
          name="password"
          type="password"
          autoComplete={isSignUp ? "new-password" : "current-password"}
          aria-describedby="password-error"
          className="mt-2 w-full rounded-2xl border bg-white px-4 py-3 font-medium outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-sky-100"
          placeholder={isSignUp ? "Ít nhất 8 ký tự, có chữ và số" : "Mật khẩu"}
        />
        <FieldError state={state} name="password" />
      </label>

      {isSignUp && (
        <label className="block font-bold text-slate-800">
          Xác nhận mật khẩu
          <input
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            aria-describedby="confirmPassword-error"
            className="mt-2 w-full rounded-2xl border bg-white px-4 py-3 font-medium outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-sky-100"
          />
          <FieldError state={state} name="confirmPassword" />
        </label>
      )}

      {state.message && (
        <p
          role="status"
          className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
            state.status === "success"
              ? "bg-emerald-50 text-emerald-800"
              : "bg-amber-50 text-amber-900"
          }`}
        >
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-2xl bg-gradient-to-r from-brand-600 to-brand-500 px-5 py-3.5 font-black text-white shadow-lg shadow-sky-200 transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60"
      >
        {pending
          ? "Đang xử lý..."
          : isSignUp
            ? "Tạo tài khoản miễn phí"
            : "Đăng nhập"}
      </button>

      <p className="text-center text-sm text-slate-600">
        {isSignUp ? "Đã có tài khoản?" : "Chưa có tài khoản?"}{" "}
        <Link
          href={`${isSignUp ? "/dang-nhap" : "/dang-ky"}${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`}
          className="font-black text-brand-700 hover:underline"
        >
          {isSignUp ? "Đăng nhập" : "Đăng ký miễn phí"}
        </Link>
      </p>
      </form>
    </div>
  );
}
