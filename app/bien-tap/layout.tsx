import type { ReactNode } from "react";
import Link from "next/link";
import { EditorSidebar } from "@/features/editor/editor-sidebar";
import { requirePermission } from "@/lib/auth/authorize";
import { getUnreadNotificationCount } from "@/lib/data/notifications";

export const dynamic = "force-dynamic";

export default async function EditorLayout({ children }: { children: ReactNode }) {
  const actor = await requirePermission("content:create");
  const unread = await getUnreadNotificationCount();
  return (
    <div className="min-h-screen bg-[#f4f8fb] text-ink-900 lg:grid lg:grid-cols-[18rem_1fr]">
      <EditorSidebar email={actor.email} />
      <div className="min-w-0">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-white/90 px-5 py-4 backdrop-blur-xl lg:px-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#087eba]">
              Haru Content Studio
            </p>
            <p className="mt-1 text-sm font-bold text-ink-600">
              Biên soạn và quản lý học liệu tiếng Hàn
            </p>
          </div>
          <Link
            href="/thong-bao"
            aria-label={
              unread > 0
                ? `Thông báo, ${unread} thông báo chưa đọc`
                : "Thông báo"
            }
            className={`group relative inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-sm font-black shadow-[0_8px_22px_rgba(8,126,186,.18)] transition hover:-translate-y-0.5 ${
              unread > 0
                ? "border-cyan-400 bg-gradient-to-r from-[#087eba] to-cyan-500 text-white"
                : "border-cyan-200 bg-cyan-50 text-[#075f88] hover:border-cyan-400 hover:bg-cyan-100"
            }`}
          >
            <span
              aria-hidden="true"
              className={`grid h-7 w-7 place-items-center rounded-full ${
                unread > 0 ? "bg-white/20" : "bg-white text-cyan-600"
              }`}
            >
              ●
            </span>
            <span>Thông báo</span>
            {unread > 0 && (
              <span className="min-w-7 rounded-full bg-amber-300 px-2 py-1 text-center text-xs font-black text-amber-950 shadow-sm">
                {unread}
              </span>
            )}
          </Link>
        </header>
        {children}
      </div>
    </div>
  );
}
