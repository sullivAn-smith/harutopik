import Link from "next/link";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { createNewRevision, deleteOrArchiveLesson, submitRevision } from "@/features/admin/content-actions";
import { EmptyState, StatusBadge } from "@/features/admin/workflow-ui";
import { getContentRevisions } from "@/lib/data/admin";

export default async function EditorContentPage({
  searchParams,
}: {
  searchParams: Promise<{
    created?: string;
    updated?: string;
    workflow?: string;
    version?: string;
    delete?: string;
    open?: string;
    errorMessage?: string;
  }>;
}) {
  const revisions = await getContentRevisions();
  const notice = await searchParams;
  return (
    <main className="mx-auto max-w-7xl px-5 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase tracking-widest text-brand-600">Thư viện cá nhân</p>
          <h1 className="mt-2 text-4xl font-black">Bài học của tôi</h1>
          <p className="mt-3 text-ink-600">Soạn bài, kiểm tra và gửi admin duyệt trong một quy trình rõ ràng.</p>
        </div>
        <Link href="/bien-tap/noi-dung/moi" className="rounded-2xl bg-brand-600 px-5 py-3 font-black text-white">+ Soạn bài mới</Link>
      </div>
      {(notice.created || notice.updated || notice.workflow === "in_review") && (
        <p className="mt-6 rounded-2xl bg-emerald-50 px-5 py-4 font-bold text-emerald-800">
          {notice.workflow === "in_review" ? "Đã gửi bài cho admin duyệt." : "Đã lưu nội dung thành công."}
        </p>
      )}
      {notice.workflow === "validation" && (
        <p className="mt-6 rounded-2xl bg-red-50 px-5 py-4 font-bold text-red-800">
          Chưa thể gửi duyệt. Hãy mở bài và xử lý các mục bắt buộc trong phần kiểm tra tự động.
        </p>
      )}
      {(notice.workflow === "error" || notice.version === "error") && (
        <p role="alert" className="mt-6 rounded-2xl bg-red-50 px-5 py-4 font-bold text-red-800">
          {notice.errorMessage ?? "Không thể hoàn tất thao tác. Hãy tải lại và thử lại."}
        </p>
      )}
      {notice.delete === "archived" && (
        <p role="status" className="mt-6 rounded-2xl bg-emerald-50 px-5 py-4 font-bold text-emerald-800">
          Đã xóa bản nháp. Bài đang phát hành vẫn được giữ nguyên cho người
          học, vì vậy ID của bài chưa thể dùng lại.
        </p>
      )}
      {notice.delete === "deleted" && (
        <p role="status" className="mt-6 rounded-2xl bg-emerald-50 px-5 py-4 font-bold text-emerald-800">
          Đã xóa vĩnh viễn bài học khỏi database. Bạn có thể dùng lại ID, slug
          và thứ tự bài; kho từ vựng vẫn được giữ để tái sử dụng.
        </p>
      )}
      {notice.delete === "error" && (
        <p role="alert" className="mt-6 rounded-2xl bg-red-50 px-5 py-4 font-bold text-red-800">
          {notice.errorMessage ?? "Chưa thể xóa bài học."}
        </p>
      )}
      {notice.open === "not-found" && (
        <p role="alert" className="mt-6 rounded-2xl bg-red-50 px-5 py-4 font-bold text-red-800">
          Không thể mở bản nháp này. Nội dung có thể đã bị xóa, không phải bài
          học hoặc không còn thuộc quyền chỉnh sửa của bạn.
        </p>
      )}
      <section className="surface-card mt-8 overflow-hidden bg-white">
        {revisions.length === 0 ? (
          <div className="p-6"><EmptyState title="Chưa có bài học" description="Hãy bắt đầu với bài đầu tiên. Bài sẽ được lưu dưới dạng bản nháp." action={<Link href="/bien-tap/noi-dung/moi" className="font-black text-brand-700">Soạn bài đầu tiên</Link>} /></div>
        ) : (
          <div className="divide-y">
            {revisions.map((revision) => (
              <article key={revision.id} className="flex flex-wrap items-center gap-4 p-5 sm:p-6">
                <Link href={`/bien-tap/noi-dung/${revision.id}`} className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-black">{revision.title}</h2><StatusBadge status={revision.status} /></div>
                  <p className="mt-2 line-clamp-1 text-sm text-ink-600">{revision.summary || revision.contentId}</p>
                  <p className="mt-2 text-xs font-semibold text-ink-400">Phiên bản {revision.version} · cập nhật {new Intl.DateTimeFormat("vi-VN").format(new Date(revision.updatedAt))}</p>
                </Link>
                {["draft", "changes_requested"].includes(revision.status) && (
                  <div className="flex gap-2">
                    <Link href={`/bien-tap/noi-dung/${revision.id}`} className="rounded-xl border px-4 py-2 text-sm font-black">Tiếp tục soạn</Link>
                    <form action={submitRevision}>
                      <input type="hidden" name="revisionId" value={revision.id} />
                      <input type="hidden" name="returnTo" value="/bien-tap/noi-dung" />
                      <button className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-black text-white">Gửi duyệt</button>
                    </form>
                  </div>
                )}
                {["published", "unpublished", "archived"].includes(revision.status) && (
                  <form action={createNewRevision}>
                    <input type="hidden" name="revisionId" value={revision.id} />
                    <input type="hidden" name="returnTo" value="/bien-tap/noi-dung" />
                    <button className="rounded-xl border px-4 py-2 text-sm font-black">Tạo phiên bản mới</button>
                  </form>
                )}
                {["draft", "changes_requested", "unpublished", "archived"].includes(revision.status) && (
                  <form action={deleteOrArchiveLesson}>
                    <input type="hidden" name="revisionId" value={revision.id} />
                    <input type="hidden" name="returnTo" value="/bien-tap/noi-dung" />
                    <ConfirmSubmitButton
                      confirmation={
                        revision.status === "unpublished"
                          ? `Xóa vĩnh viễn bài “${revision.title}”? ID, slug và thứ tự bài sẽ được giải phóng; tiến độ của bài cũ sẽ bị xóa. Kho từ vựng vẫn được giữ để tái sử dụng.`
                          : revision.status === "archived"
                            ? `Xóa phiên bản “${revision.title}”? Nếu bài không còn phát hành, bài sẽ bị xóa vĩnh viễn và có thể dùng lại ID. Kho từ vựng vẫn được giữ.`
                            : `Xóa bản nháp “${revision.title}”? Nếu bài chưa từng phát hành, bài sẽ bị xóa vĩnh viễn và có thể dùng lại ID. Phiên bản đang phát hành, nếu có, không bị ảnh hưởng.`
                      }
                      className="rounded-xl border border-red-300 px-4 py-2 text-sm font-black text-red-700"
                    >
                      {revision.status === "unpublished"
                        ? "Xóa bài"
                        : revision.status === "archived"
                          ? "Xóa bài"
                          : "Xóa bản nháp"}
                    </ConfirmSubmitButton>
                  </form>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
