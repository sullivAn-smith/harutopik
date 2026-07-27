import type { Metadata } from "next";
import Link from "next/link";
import { getAdminContentStats } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Quản trị" };

export default async function AdminDashboardPage() {
  const stats = await getAdminContentStats();

  return (
    <main className="mx-auto max-w-7xl px-5 py-10">
      <p className="text-sm font-black uppercase tracking-widest text-brand-600">Tổng quan hôm nay</p>
      <h1 className="mt-2 text-4xl font-black">Nội dung đang ở đâu?</h1>
      <p className="mt-3 text-ink-600">Theo dõi bài chờ duyệt và các nội dung sẵn sàng đưa đến người học.</p>
      <section className="mt-8 grid gap-4 sm:grid-cols-4">
        {[
          ["Chờ duyệt", stats.in_review ?? 0, "bg-blue-50 text-blue-800"],
          ["Đã duyệt", stats.approved ?? 0, "bg-emerald-50 text-emerald-800"],
          ["Đang phát hành", stats.published ?? 0, "bg-violet-50 text-violet-800"],
          ["Cần chỉnh sửa", stats.changes_requested ?? 0, "bg-amber-50 text-amber-800"],
        ].map(([label, value, style]) => (
          <article key={label} className={`rounded-3xl p-6 ${style}`}>
            <p className="text-sm font-bold">{label}</p><p className="mt-2 text-4xl font-black">{value}</p>
          </article>
        ))}
      </section>
      <section className="mt-8 grid gap-5 md:grid-cols-3">
        {[
          ["Hàng chờ duyệt", "Đọc nội dung, chạy thử và phản hồi cho người biên tập.", "/quan-tri/duyet"],
          ["Phát hành", "Đưa bài đã duyệt đến người học hoặc tạm gỡ khi cần.", "/quan-tri/phat-hanh"],
          ["Toàn bộ nội dung", "Theo dõi trạng thái và lịch sử của mọi phiên bản.", "/quan-tri/noi-dung"],
        ].map(([title, description, href]) => (
          <Link key={title} href={href} className="surface-card bg-white p-6 transition hover:-translate-y-1">
            <h2 className="text-xl font-black">{title}</h2>
            <p className="mt-2 leading-7 text-ink-600">{description}</p>
            <p className="mt-5 font-black text-brand-700">Mở khu vực →</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
