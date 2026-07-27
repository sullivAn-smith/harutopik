import Link from "next/link";
import { getContentRevisions } from "@/lib/data/admin";
import { StatusBadge } from "@/features/admin/workflow-ui";

export default async function EditorDashboardPage() {
  const revisions = await getContentRevisions();
  const drafts = revisions.filter((item) => ["draft", "changes_requested"].includes(item.status));
  const reviewing = revisions.filter((item) => item.status === "in_review");
  return (
    <main className="mx-auto max-w-7xl px-5 py-10">
      <p className="text-sm font-black uppercase tracking-widest text-brand-600">Không gian biên tập</p>
      <h1 className="mt-2 text-4xl font-black">Chào bạn, hôm nay soạn gì?</h1>
      <p className="mt-3 max-w-2xl leading-7 text-ink-600">Tập trung vào nội dung. Hệ thống sẽ hướng dẫn kiểm tra và gửi duyệt khi bài đã sẵn sàng.</p>
      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          ["Đang soạn", drafts.length, "Có thể tiếp tục chỉnh sửa"],
          ["Chờ duyệt", reviewing.length, "Admin đang kiểm tra"],
          ["Tổng nội dung", revisions.length, "Tất cả bài do bạn tạo"],
        ].map(([label, value, note]) => (
          <article key={label} className="surface-card bg-white p-6">
            <p className="text-sm font-bold text-ink-600">{label}</p>
            <p className="mt-2 text-4xl font-black">{value}</p>
            <p className="mt-2 text-sm text-ink-600">{note}</p>
          </article>
        ))}
      </section>
      <section className="surface-card mt-8 bg-white p-6">
        <div className="flex items-center justify-between gap-4">
          <div><h2 className="text-2xl font-black">Cần bạn xử lý</h2><p className="mt-1 text-ink-600">Bản nháp và bài được yêu cầu chỉnh sửa.</p></div>
          <Link href="/bien-tap/noi-dung" className="font-black text-brand-700">Xem tất cả →</Link>
        </div>
        <div className="mt-5 grid gap-3">
          {drafts.slice(0, 5).map((item) => (
            <Link key={item.id} href={`/bien-tap/noi-dung/${item.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-slate-50 p-4 hover:border-brand-400">
              <div><p className="font-black">{item.title}</p><p className="mt-1 text-sm text-ink-600">{item.summary}</p></div>
              <StatusBadge status={item.status} />
            </Link>
          ))}
          {drafts.length === 0 && <p className="rounded-2xl bg-emerald-50 p-5 font-bold text-emerald-800">Bạn không có bài nào cần xử lý.</p>}
        </div>
      </section>
    </main>
  );
}
