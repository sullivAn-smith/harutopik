"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const sections = [
  {
    label: "Điều hành",
    items: [
      { icon: "⌂", label: "Tổng quan", href: "/quan-tri" },
      { icon: "✓", label: "Hàng chờ duyệt", href: "/quan-tri/duyet" },
      { icon: "↑", label: "Phát hành", href: "/quan-tri/phat-hanh" },
    ],
  },
  {
    label: "Hệ thống",
    items: [
      { icon: "≡", label: "Tất cả nội dung", href: "/quan-tri/noi-dung" },
      { icon: "♙", label: "Tài khoản & quyền", href: "/quan-tri/tai-khoan" },
    ],
  },
];

export function AdminSidebar({
  email,
  unread,
}: {
  email: string;
  unread: number;
}) {
  const pathname = usePathname();
  const active = (href: string) =>
    href === "/quan-tri"
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside className="relative overflow-hidden border-r border-white/10 bg-[linear-gradient(165deg,#08192e_0%,#10243e_52%,#162b55_100%)] px-5 py-6 text-white lg:sticky lg:top-0 lg:h-screen">
      <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-cyan-400/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-16 h-52 w-52 rounded-full bg-violet-500/15 blur-3xl" />

      <Link href="/quan-tri" className="relative flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#54e2ff,#8b8cff)] text-xl font-black text-[#08192e] shadow-[0_10px_28px_rgba(84,226,255,.22)]">H</span>
        <span>
          <strong className="block text-xl tracking-tight">Haru Control</strong>
          <small className="font-semibold text-slate-300">Admin workspace</small>
        </span>
      </Link>

      <div className="relative mt-7 rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399]" />
          <p className="text-xs font-black uppercase tracking-[0.15em] text-emerald-200">Hệ thống hoạt động</p>
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-300">Kiểm duyệt, phát hành và phân quyền tập trung.</p>
      </div>

      <nav className="relative mt-7 space-y-6" aria-label="Quản trị">
        {sections.map((section) => (
          <section key={section.label}>
            <p className="mb-2 px-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{section.label}</p>
            <div className="grid gap-1.5">
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition ${
                    active(item.href)
                      ? "bg-white text-[#10243e] shadow-[0_9px_22px_rgba(0,0,0,.2)]"
                      : "text-slate-200 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-base transition ${active(item.href) ? "bg-violet-100 text-violet-700" : "bg-white/[0.08] text-cyan-300 group-hover:bg-white/15"}`}>{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </section>
        ))}
        <section>
          <p className="mb-2 px-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Cập nhật</p>
          <Link href="/thong-bao" className={`flex items-center justify-between rounded-xl px-3 py-3 text-sm font-bold transition ${pathname === "/thong-bao" ? "bg-white text-[#10243e]" : "text-slate-200 hover:bg-white/10"}`}>
            <span className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.08] text-cyan-300">●</span>Thông báo</span>
            {unread > 0 && <span className="min-w-6 rounded-full bg-amber-300 px-2 py-1 text-center text-xs font-black text-amber-950">{unread}</span>}
          </Link>
        </section>
      </nav>

      <div className="relative mt-8 border-t border-white/10 pt-5 lg:absolute lg:bottom-6 lg:left-5 lg:right-5">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-sm font-black text-cyan-200">A</span>
          <div className="min-w-0"><p className="truncate text-xs font-bold text-white">{email}</p><p className="mt-0.5 text-[11px] text-slate-400">Quản trị viên</p></div>
        </div>
        <Link href="/" className="mt-4 flex items-center justify-between rounded-xl border border-white/10 px-3 py-2.5 text-sm font-bold text-slate-300 transition hover:bg-white/10 hover:text-white"><span>Về website học</span><span>↗</span></Link>
      </div>
    </aside>
  );
}
