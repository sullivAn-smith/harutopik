import Link from "next/link";
import type { ReactNode } from "react";
import { requirePermission } from "@/lib/auth/authorize";

export const dynamic = "force-dynamic";

export default async function EditorLayout({ children }: { children: ReactNode }) {
  const actor = await requirePermission("content:create");
  return (
    <div className="min-h-screen bg-[#f6f9fc] text-ink-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <Link href="/bien-tap" className="flex items-center gap-3 text-xl font-black">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">H</span>
            Studio nội dung
          </Link>
          <nav className="flex gap-2 text-sm font-bold" aria-label="Biên tập nội dung">
            <Link href="/bien-tap" className="rounded-xl px-4 py-2 hover:bg-sky-50">Tổng quan</Link>
            <Link href="/bien-tap/noi-dung" className="rounded-xl px-4 py-2 hover:bg-sky-50">Bài của tôi</Link>
            <Link href="/bien-tap/tu-vung" className="rounded-xl px-4 py-2 hover:bg-sky-50">Thư viện từ</Link>
            <Link href="/bien-tap/nhap-tu-vung" className="rounded-xl px-4 py-2 hover:bg-sky-50">Nhập Excel/CSV</Link>
            <Link href="/bien-tap/audio" className="rounded-xl px-4 py-2 hover:bg-sky-50">Audio</Link>
            <Link href="/bien-tap/noi-dung/moi" className="rounded-xl bg-brand-600 px-4 py-2 text-white">+ Soạn bài mới</Link>
          </nav>
          <div className="text-right">
            <p className="max-w-56 truncate text-xs font-semibold text-ink-600">{actor.email}</p>
            <Link href="/" className="text-xs font-bold text-brand-700">Về trang học</Link>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
