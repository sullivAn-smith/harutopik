import type { ReactNode } from "react";
import { AdminSidebar } from "@/features/admin/admin-sidebar";
import { requirePermission } from "@/lib/auth/authorize";
import { getUnreadNotificationCount } from "@/lib/data/notifications";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const actor = await requirePermission("content:approve");
  const unread = await getUnreadNotificationCount();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,#edf3ff_0,#f5f8fc_32%,#f4f7fb_70%)] text-ink-900 lg:grid lg:grid-cols-[18rem_1fr]">
      <AdminSidebar email={actor.email} unread={unread} />
      <div className="min-w-0">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-white/80 px-5 py-4 backdrop-blur-xl lg:px-8">
          <div><p className="text-xs font-black uppercase tracking-[0.16em] text-violet-600">Haru Control Center</p><p className="mt-1 text-sm font-bold text-ink-600">Quản trị hệ thống và chất lượng học liệu</p></div>
          <div className="flex items-center gap-2 rounded-full border bg-white px-3 py-2 text-xs font-bold text-ink-600 shadow-sm"><span className="h-2 w-2 rounded-full bg-emerald-500" />Production</div>
        </header>
        {children}
      </div>
    </div>
  );
}
