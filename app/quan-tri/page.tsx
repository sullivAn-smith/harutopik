import type { Metadata } from "next";
import Link from "next/link";
import { getAdminContentStats } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Quản trị" };

export default async function AdminDashboardPage() {
  const stats = await getAdminContentStats();
  const cards = [
    { label: "Chờ duyệt", value: stats.in_review ?? 0, note: "Cần kiểm tra chất lượng", icon: "✓", color: "from-blue-500 to-cyan-400", soft: "bg-blue-50 text-blue-800", href: "/quan-tri/duyet" },
    { label: "Đã duyệt", value: stats.approved ?? 0, note: "Sẵn sàng phát hành", icon: "◎", color: "from-emerald-500 to-teal-400", soft: "bg-emerald-50 text-emerald-800", href: "/quan-tri/phat-hanh" },
    { label: "Đang phát hành", value: stats.published ?? 0, note: "Người học đang truy cập", icon: "↑", color: "from-violet-500 to-indigo-500", soft: "bg-violet-50 text-violet-800", href: "/quan-tri/phat-hanh" },
    { label: "Cần chỉnh sửa", value: stats.changes_requested ?? 0, note: "Đã trả về biên tập", icon: "↩", color: "from-amber-500 to-orange-400", soft: "bg-amber-50 text-amber-900", href: "/quan-tri/noi-dung" },
  ];

  return (
    <main className="mx-auto max-w-[90rem] px-5 py-8 lg:px-8 lg:py-10">
      <section className="relative overflow-hidden rounded-[2rem] bg-[linear-gradient(120deg,#0d2039_0%,#152f57_58%,#33428c_100%)] p-7 text-white shadow-[0_22px_55px_rgba(16,36,62,.2)] lg:p-10">
        <div className="absolute -right-10 -top-20 h-72 w-72 rounded-full border-[45px] border-cyan-300/10" />
        <div className="absolute bottom-0 right-1/4 h-32 w-32 rounded-full bg-violet-400/10 blur-2xl" />
        <div className="relative max-w-3xl">
          <span className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-cyan-200">Tổng quan vận hành</span>
          <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">Mọi nội dung đều<br className="hidden sm:block" /> trong tầm kiểm soát.</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">Theo dõi quy trình từ lúc biên tập gửi bài đến khi người học tiếp cận, đồng thời quản lý tài khoản và quyền truy cập tại một nơi.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/quan-tri/duyet" className="rounded-2xl bg-white px-5 py-3 font-black text-[#10243e] shadow-lg transition hover:-translate-y-0.5">Mở hàng chờ duyệt →</Link>
            <Link href="/quan-tri/tai-khoan" className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 font-black text-white transition hover:bg-white/15">Quản lý tài khoản</Link>
          </div>
        </div>
      </section>

      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.label} href={card.href} className="group relative overflow-hidden rounded-3xl border border-white bg-white p-6 shadow-[0_12px_34px_rgba(16,36,62,.08)] transition hover:-translate-y-1 hover:shadow-[0_18px_42px_rgba(16,36,62,.13)]">
            <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${card.color}`} />
            <div className="flex items-start justify-between"><span className={`flex h-11 w-11 items-center justify-center rounded-2xl text-lg font-black ${card.soft}`}>{card.icon}</span><span className="text-sm font-black text-ink-400 transition group-hover:translate-x-1">→</span></div>
            <p className="mt-5 text-sm font-bold text-ink-600">{card.label}</p>
            <p className="mt-1 text-4xl font-black tracking-tight">{card.value}</p>
            <p className="mt-2 text-xs font-semibold text-ink-400">{card.note}</p>
          </Link>
        ))}
      </section>

      <section className="mt-7 grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
        <div className="rounded-3xl border bg-white p-6 shadow-[0_12px_34px_rgba(16,36,62,.07)] lg:p-7">
          <div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-violet-600">Quy trình nội dung</p><h2 className="mt-2 text-2xl font-black">Luồng kiểm soát chất lượng</h2></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">Đang vận hành</span></div>
          <div className="mt-7 grid gap-3 sm:grid-cols-4">
            {[["1", "Biên tập", "Soạn và gửi"], ["2", "Kiểm duyệt", "Đọc và phản hồi"], ["3", "Phát hành", "Đưa lên catalog"], ["4", "Người học", "Tiếp cận bài"]].map(([step, title, note], index) => (
              <div key={step} className="relative rounded-2xl bg-slate-50 p-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#10243e] text-xs font-black text-white">{step}</span>
                <p className="mt-4 font-black">{title}</p><p className="mt-1 text-xs text-ink-600">{note}</p>
                {index < 3 && <span className="absolute -right-2 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-white text-xs font-black text-violet-600 shadow sm:flex">›</span>}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border bg-[linear-gradient(145deg,#eef6ff,#f4efff)] p-6 shadow-[0_12px_34px_rgba(16,36,62,.07)] lg:p-7">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Truy cập nhanh</p>
          <div className="mt-4 grid gap-3">
            <Link href="/quan-tri/noi-dung" className="flex items-center justify-between rounded-2xl bg-white/80 px-4 py-3.5 font-black shadow-sm transition hover:bg-white"><span>Kho nội dung</span><span className="text-violet-600">→</span></Link>
            <Link href="/quan-tri/phat-hanh" className="flex items-center justify-between rounded-2xl bg-white/80 px-4 py-3.5 font-black shadow-sm transition hover:bg-white"><span>Release Center</span><span className="text-violet-600">→</span></Link>
            <Link href="/thong-bao" className="flex items-center justify-between rounded-2xl bg-white/80 px-4 py-3.5 font-black shadow-sm transition hover:bg-white"><span>Thông báo</span><span className="text-violet-600">→</span></Link>
          </div>
        </div>
      </section>
    </main>
  );
}
