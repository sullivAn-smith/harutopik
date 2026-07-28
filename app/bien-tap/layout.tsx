import type { ReactNode } from "react";
import { EditorSidebar } from "@/features/editor/editor-sidebar";
import { requirePermission } from "@/lib/auth/authorize";
import { getUnreadNotificationCount } from "@/lib/data/notifications";

export const dynamic = "force-dynamic";

export default async function EditorLayout({ children }: { children: ReactNode }) {
  const actor = await requirePermission("content:create");
  const unread = await getUnreadNotificationCount();
  return (
    <div className="min-h-screen bg-[#f4f8fb] text-ink-900 lg:grid lg:grid-cols-[18rem_1fr]">
      <EditorSidebar email={actor.email} unread={unread} />
      <div className="min-w-0">
        <header className="border-b border-slate-200 bg-white/90 px-5 py-4 backdrop-blur lg:px-8">
          <p className="text-sm font-bold text-ink-600">Biên soạn học liệu tiếng Hàn</p>
        </header>
        {children}
      </div>
    </div>
  );
}
