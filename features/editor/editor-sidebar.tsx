"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const groups = [
  {
    label: "Không gian làm việc",
    items: [
      { icon: "⌂", label: "Tổng quan", href: "/bien-tap" },
      { icon: "✎", label: "Bài của tôi", href: "/bien-tap/noi-dung" },
      { icon: "▦", label: "Khóa & chương", href: "/bien-tap/cau-truc" },
      { icon: "◉", label: "Ngân hàng đề", href: "/bien-tap/de-thi" },
    ],
  },
  {
    label: "Kho học liệu",
    items: [
      { icon: "가", label: "Thư viện từ", href: "/bien-tap/tu-vung" },
      { icon: "⇧", label: "Nhập Excel / CSV", href: "/bien-tap/nhap-tu-vung" },
      { icon: "♪", label: "Audio", href: "/bien-tap/audio" },
    ],
  },
];

export function EditorSidebar({
  email,
}: {
  email: string;
}) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/bien-tap"
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside className="border-r border-[#173f5f] bg-[linear-gradient(180deg,#09283f_0%,#0d3853_55%,#075c72_100%)] px-5 py-6 text-white lg:sticky lg:top-0 lg:h-screen">
      <Link href="/bien-tap" className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 to-emerald-300 text-xl font-black text-[#09283f] shadow-[0_8px_24px_rgba(45,212,191,.28)]">H</span>
        <span><strong className="block text-xl">Haru Studio</strong><small className="font-semibold text-cyan-100">Không gian biên tập</small></span>
      </Link>

      <Link href="/bien-tap/noi-dung/moi" className="mt-7 flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3.5 font-black text-[#0a4058] shadow-[0_8px_24px_rgba(0,0,0,.16)] transition hover:-translate-y-0.5">
        <span className="text-xl">＋</span> Soạn bài mới
      </Link>

      <nav className="mt-7 space-y-6" aria-label="Biên tập nội dung">
        {groups.map((group) => (
          <section key={group.label}>
            <p className="mb-2 px-3 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-200/80">{group.label}</p>
            <div className="grid gap-1.5">
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition ${
                    isActive(item.href)
                      ? "bg-white text-[#0b4058] shadow-lg"
                      : "text-slate-100 hover:bg-white/10"
                  }`}
                >
                  <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-base ${isActive(item.href) ? "bg-cyan-100 text-cyan-800" : "bg-white/10 text-cyan-200"}`}>{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </section>
        ))}
      </nav>

      <div className="mt-8 border-t border-white/15 pt-5 lg:absolute lg:bottom-6 lg:left-5 lg:right-5">
        <p className="truncate text-xs font-semibold text-cyan-100">{email}</p>
        <Link href="/" className="mt-3 inline-flex text-sm font-black text-cyan-200 hover:text-white">← Về trang học</Link>
      </div>
    </aside>
  );
}
