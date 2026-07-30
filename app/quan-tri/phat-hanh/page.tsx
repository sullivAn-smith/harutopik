import { ReleaseManager } from "@/features/admin/release-manager";
import { getReleaseQueue } from "@/lib/data/admin";

export default async function ReleasePage({
  searchParams,
}: {
  searchParams: Promise<{
    release?: string;
    workflow?: string;
    review?: string;
    approval?: string;
    errorMessage?: string;
  }>;
}) {
  const items = await getReleaseQueue();
  const notice = await searchParams;
  return (
    <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <p className="text-sm font-black uppercase tracking-widest text-violet-600">Release center</p>
      <h1 className="mt-2 text-4xl font-black">Phát hành nội dung</h1>
      <p className="mt-3 max-w-2xl leading-7 text-ink-600">Chỉ bài đã được phê duyệt mới có thể đưa đến người học. Tạm gỡ không xóa dữ liệu hoặc tiến độ.</p>
      {(notice.release || notice.workflow || notice.approval) && (
        <p
          role={
            notice.release === "error" ||
            notice.workflow === "error" ||
            notice.approval === "error"
              ? "alert"
              : "status"
          }
          className={`mt-6 rounded-2xl px-5 py-4 font-bold ${
            notice.release === "error" ||
            notice.workflow === "error" ||
            notice.approval === "error"
              ? "bg-red-50 text-red-800"
              : "bg-emerald-50 text-emerald-800"
          }`}
        >
          {notice.release === "error" ||
          notice.workflow === "error" ||
          notice.approval === "error"
            ? (notice.errorMessage ?? "Không thể cập nhật trạng thái phát hành.")
            : "Đã cập nhật trạng thái phát hành thành công."}
        </p>
      )}
      {notice.review === "approved" && (
        <p role="status" className="mt-6 rounded-2xl bg-emerald-50 px-5 py-4 font-bold text-emerald-800">
          Đã phê duyệt nội dung. Bài hiện đã sẵn sàng để admin phát hành.
        </p>
      )}
      <ReleaseManager
        items={items}
        initialTab={
          notice.release === "unpublished" ? "published" : "waiting"
        }
      />
    </main>
  );
}
