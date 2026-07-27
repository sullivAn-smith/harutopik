import type { Metadata } from "next";
import Link from "next/link";
import { createNewRevision, submitRevision } from "@/features/admin/content-actions";
import { StatusBadge } from "@/features/admin/workflow-ui";
import { getContentRevisions } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Quản trị nội dung" };

export default async function AdminContentPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; updated?: string; workflow?: string }>;
}) {
  const revisions = await getContentRevisions();
  const { created, updated, workflow } = await searchParams;
  const workflowMessage: Record<string, string> = {
    in_review: "Đã gửi bản nháp sang hàng chờ duyệt.",
    approved: "Bản nội dung đã được phê duyệt.",
    published: "Đã xuất bản nội dung vào catalog dành cho người học.",
    error: "Không thể chuyển trạng thái. Hãy tải lại và kiểm tra trạng thái hiện tại.",
    invalid: "Không tìm thấy revision cần xử lý.",
    validation: "Bài chưa đạt kiểm tra dữ liệu bắt buộc. Hãy mở bài để xem chi tiết.",
  };

  return (
    <main className="mx-auto max-w-7xl px-5 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase tracking-widest text-brand-600">Content workflow</p>
          <h1 className="mt-2 text-4xl font-black">Phiên bản nội dung</h1>
          <p className="mt-3 text-ink-600">Nháp → gửi duyệt → phê duyệt → xuất bản, có lịch sử đầy đủ.</p>
        </div>
        <Link href="/quan-tri/noi-dung/moi" className="rounded-2xl bg-brand-600 px-5 py-3 font-black text-white">+ Tạo bài học</Link>
      </div>
      {created === "1" && (
        <p role="status" className="mt-6 rounded-2xl bg-emerald-50 px-5 py-4 font-bold text-emerald-800">
          Đã tạo bản nháp. Nội dung chưa được xuất bản cho người học.
        </p>
      )}
      {updated === "1" && (
        <p role="status" className="mt-6 rounded-2xl bg-emerald-50 px-5 py-4 font-bold text-emerald-800">
          Đã lưu thay đổi cho bản nháp.
        </p>
      )}
      {workflow && workflowMessage[workflow] && (
        <p role="status" className="mt-6 rounded-2xl bg-sky-50 px-5 py-4 font-bold text-brand-800">
          {workflowMessage[workflow]}
        </p>
      )}
      <section className="surface-card mt-8 overflow-hidden bg-white">
        {revisions.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-xl font-black">Chưa có bản nháp trong database</p>
            <p className="mt-2 text-ink-600">Hãy tạo bài học đầu tiên hoặc nhập catalog hiện tại vào database.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-sm text-ink-600"><tr><th className="px-5 py-4">Nội dung</th><th className="px-5 py-4">Loại</th><th className="px-5 py-4">Phiên bản</th><th className="px-5 py-4">Trạng thái</th><th className="px-5 py-4">Cập nhật</th><th className="px-5 py-4">Thao tác</th></tr></thead>
              <tbody>
                {revisions.map((revision) => (
                  <tr key={revision.id} className="border-t">
                    <td className="px-5 py-4 font-bold">
                      <Link href={`/quan-tri/noi-dung/${revision.id}`} className="text-brand-700 hover:underline">
                        {revision.contentId}
                      </Link>
                    </td>
                    <td className="px-5 py-4">{revision.contentType}</td>
                    <td className="px-5 py-4">v{revision.version}</td>
                    <td className="px-5 py-4"><StatusBadge status={revision.status} /></td>
                    <td className="px-5 py-4">{new Intl.DateTimeFormat("vi-VN").format(new Date(revision.updatedAt))}</td>
                    <td className="px-5 py-4">
                      {revision.status === "draft" && (
                        <form action={submitRevision}>
                          <input type="hidden" name="revisionId" value={revision.id} />
                          <button className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-black text-white">Gửi duyệt</button>
                        </form>
                      )}
                      {revision.status === "in_review" && (
                        <Link href={`/quan-tri/duyet/${revision.id}`} className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-black text-white">Mở duyệt</Link>
                      )}
                      {revision.status === "approved" && (
                        <Link href="/quan-tri/phat-hanh" className="rounded-xl bg-violet-600 px-3 py-2 text-sm font-black text-white">Đến phát hành</Link>
                      )}
                      {revision.status === "published" && (
                        <Link href="/quan-tri/phat-hanh" className="text-sm font-bold text-emerald-700">Đang hoạt động</Link>
                      )}
                      {["published", "unpublished", "archived"].includes(revision.status) && (
                        <form action={createNewRevision} className="mt-2">
                          <input type="hidden" name="revisionId" value={revision.id} />
                          <button className="rounded-xl border px-3 py-2 text-sm font-black">Tạo bản mới</button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
