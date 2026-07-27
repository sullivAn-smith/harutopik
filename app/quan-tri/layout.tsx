import Link from "next/link";
import type { ReactNode } from "react";
import { requirePermission } from "@/lib/auth/authorize";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const actor = await requirePermission("content:approve");

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-ink-900 lg:grid lg:grid-cols-[17rem_1fr]">
      <aside className="border-r border-slate-200 bg-[#10243e] px-5 py-6 text-white lg:sticky lg:top-0 lg:h-screen">
        <Link href="/quan-tri" className="flex items-center gap-3 text-xl font-black">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400 text-[#10243e]">H</span>
          Harutopik Admin
        </Link>
        <p className="mt-3 text-xs font-semibold text-slate-300">Kiểm duyệt và phát hành nội dung</p>
        <nav className="mt-8 grid gap-2 text-sm font-bold" aria-label="Quản trị">
          {[
            ["▦", "Tổng quan", "/quan-tri"],
            ["◎", "Hàng chờ duyệt", "/quan-tri/duyet"],
            ["↑", "Phát hành", "/quan-tri/phat-hanh"],
            ["⌘", "Khóa học & chương", "/quan-tri/cau-truc"],
            ["≡", "Tất cả nội dung", "/quan-tri/noi-dung"],
          ].map(([icon, label, href]) => (
            <Link key={href} href={href} className="flex items-center gap-3 rounded-xl px-3 py-3 text-slate-100 transition hover:bg-white/10">
              <span className="text-lg text-cyan-300">{icon}</span>{label}
            </Link>
          ))}
        </nav>
        <div className="mt-8 border-t border-white/10 pt-5 lg:absolute lg:bottom-6 lg:left-5 lg:right-5">
          <p className="truncate text-xs text-slate-300">{actor.email}</p>
          <Link href="/" className="mt-3 inline-flex text-sm font-bold text-cyan-300 hover:text-white">← Về website học</Link>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="border-b border-slate-200 bg-white px-5 py-4 lg:px-8">
          <p className="text-sm font-bold text-ink-600">Trung tâm vận hành nội dung</p>
        </header>
        {children}
      </div>
    </div>
  );
}
