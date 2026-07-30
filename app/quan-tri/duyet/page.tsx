import Link from "next/link";
import { EmptyState } from "@/features/admin/workflow-ui";
import { getReviewQueue } from "@/lib/data/admin";

export default async function ReviewQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ review?: string; approval?: string }>;
}) {
  const queue = await getReviewQueue();
  const { review, approval } = await searchParams;
  return (
    <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <p className="text-sm font-black uppercase tracking-widest text-blue-600">Kiểm duyệt nội dung</p>
      <h1 className="mt-2 text-4xl font-black">Hàng chờ duyệt</h1>
      <p className="mt-3 max-w-2xl leading-7 text-ink-600">Kiểm tra độ chính xác, trải nghiệm học và phản hồi rõ ràng trước khi phê duyệt.</p>
      {review && (
        <p className="mt-6 rounded-2xl bg-emerald-50 px-5 py-4 font-bold text-emerald-800">
          {review === "approved" ? "Đã phê duyệt. Bài đang chờ phát hành." : "Đã gửi yêu cầu chỉnh sửa cho người biên tập."}
        </p>
      )}
      {approval === "revoked" && (
        <p
          role="status"
          className="mt-6 rounded-2xl bg-amber-50 px-5 py-4 font-bold text-amber-800"
        >
          Đã hủy phê duyệt. Nội dung đã quay lại hàng chờ để admin xem xét lại.
        </p>
      )}
      <section className="surface-card mt-8 bg-white p-5 sm:p-6">
        {queue.length === 0 ? <EmptyState title="Đã xử lý hết hàng chờ" description="Hiện không có bài học nào đang chờ admin duyệt." /> : (
          <div className="grid gap-4">
            {queue.map((item, index) => (
              <Link key={item.id} href={`/quan-tri/duyet/${item.id}`} className="flex flex-wrap items-center gap-5 rounded-2xl border p-5 transition hover:border-blue-400 hover:bg-blue-50/40">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 font-black text-blue-700">{index + 1}</span>
                <div className="min-w-0 flex-1"><h2 className="text-lg font-black">{item.title}</h2><p className="mt-1 text-sm text-ink-600">{item.contentId} · phiên bản {item.version}</p></div>
                <div className="text-right"><p className="text-xs font-bold text-ink-400">Gửi duyệt</p><p className="mt-1 text-sm font-bold">{new Intl.DateTimeFormat("vi-VN").format(new Date(item.updatedAt))}</p></div>
                <span className="font-black text-blue-700">Mở để duyệt →</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
