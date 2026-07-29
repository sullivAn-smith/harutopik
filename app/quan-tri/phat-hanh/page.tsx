import { publishRevision, unpublishRevision } from "@/features/admin/content-actions";
import { EmptyState, StatusBadge } from "@/features/admin/workflow-ui";
import { getReleaseQueue } from "@/lib/data/admin";

export default async function ReleasePage({
  searchParams,
}: {
  searchParams: Promise<{ release?: string; workflow?: string; review?: string; errorMessage?: string }>;
}) {
  const items = await getReleaseQueue();
  const notice = await searchParams;
  return (
    <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <p className="text-sm font-black uppercase tracking-widest text-violet-600">Release center</p>
      <h1 className="mt-2 text-4xl font-black">Phát hành nội dung</h1>
      <p className="mt-3 max-w-2xl leading-7 text-ink-600">Chỉ bài đã được phê duyệt mới có thể đưa đến người học. Tạm gỡ không xóa dữ liệu hoặc tiến độ.</p>
      {(notice.release || notice.workflow) && (
        <p
          role={notice.release === "error" || notice.workflow === "error" ? "alert" : "status"}
          className={`mt-6 rounded-2xl px-5 py-4 font-bold ${
            notice.release === "error" || notice.workflow === "error"
              ? "bg-red-50 text-red-800"
              : "bg-emerald-50 text-emerald-800"
          }`}
        >
          {notice.release === "error" || notice.workflow === "error"
            ? (notice.errorMessage ?? "Không thể cập nhật trạng thái phát hành.")
            : "Đã cập nhật trạng thái phát hành thành công."}
        </p>
      )}
      {notice.review === "approved" && (
        <p role="status" className="mt-6 rounded-2xl bg-emerald-50 px-5 py-4 font-bold text-emerald-800">
          Đã phê duyệt nội dung. Bài hiện đã sẵn sàng để admin phát hành.
        </p>
      )}
      <section className="surface-card mt-8 overflow-hidden bg-white">
        {items.length === 0 ? <div className="p-6"><EmptyState title="Chưa có nội dung để phát hành" description="Bài được admin phê duyệt sẽ xuất hiện tại đây." /></div> : (
          <div className="divide-y">
            {items.map((item) => (
              <article key={item.id} className="flex flex-wrap items-center gap-4 p-6">
                <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-3"><h2 className="text-lg font-black">{item.title}</h2><StatusBadge status={item.status} /></div><p className="mt-2 text-sm text-ink-600">{item.contentId} · phiên bản {item.version}</p></div>
                {item.status === "approved" && <form action={publishRevision}><input type="hidden" name="revisionId" value={item.id} /><input type="hidden" name="returnTo" value="/quan-tri/phat-hanh" /><button className="rounded-2xl bg-violet-600 px-5 py-3 font-black text-white">Phát hành ngay</button></form>}
                {item.status === "published" && <form action={unpublishRevision} className="flex gap-2"><input type="hidden" name="revisionId" value={item.id} /><input name="note" aria-label="Lý do tạm gỡ" placeholder="Lý do tạm gỡ" className="rounded-xl border px-3 py-2 text-sm" /><button className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-black text-rose-800">Tạm gỡ</button></form>}
                {item.status === "unpublished" && <span className="text-sm font-bold text-ink-600">Không hiển thị với người học</span>}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
