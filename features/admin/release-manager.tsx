"use client";

import { useState } from "react";
import {
  publishRevision,
  revokeApproval,
  unpublishRevision,
} from "@/features/admin/content-actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { EmptyState, StatusBadge } from "@/features/admin/workflow-ui";

type ReleaseItem = {
  id: string;
  contentId: string;
  version: number;
  status: string;
  title: string;
};

type ReleaseTab = "waiting" | "published";

export function ReleaseManager({
  items,
  initialTab = "waiting",
}: {
  items: ReleaseItem[];
  initialTab?: ReleaseTab;
}) {
  const [activeTab, setActiveTab] = useState<ReleaseTab>(initialTab);
  const [unpublishItem, setUnpublishItem] = useState<ReleaseItem | null>(null);
  const waitingItems = items.filter((item) => item.status === "approved");
  const publishedItems = items.filter((item) => item.status === "published");
  const activeItems =
    activeTab === "waiting" ? waitingItems : publishedItems;

  return (
    <>
      <div
        className="mt-8 grid gap-3 rounded-3xl border border-sky-100 bg-white p-3 shadow-[0_16px_40px_rgba(16,36,62,0.08)] sm:grid-cols-2"
        role="tablist"
        aria-label="Trạng thái phát hành"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "waiting"}
          onClick={() => setActiveTab("waiting")}
          className={`flex min-h-16 items-center justify-between rounded-2xl px-5 py-3 text-left transition ${
            activeTab === "waiting"
              ? "bg-gradient-to-r from-blue-700 to-sky-500 text-white shadow-lg"
              : "bg-slate-50 text-ink-700 hover:bg-sky-50"
          }`}
        >
          <span>
            <strong className="block text-base font-black">
              Chờ phát hành
            </strong>
            <span
              className={`mt-0.5 block text-xs font-semibold ${
                activeTab === "waiting" ? "text-white/80" : "text-ink-500"
              }`}
            >
              Nội dung đã được duyệt
            </span>
          </span>
          <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-black">
            {waitingItems.length}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "published"}
          onClick={() => setActiveTab("published")}
          className={`flex min-h-16 items-center justify-between rounded-2xl px-5 py-3 text-left transition ${
            activeTab === "published"
              ? "bg-gradient-to-r from-emerald-700 to-emerald-500 text-white shadow-lg"
              : "bg-slate-50 text-ink-700 hover:bg-emerald-50"
          }`}
        >
          <span>
            <strong className="block text-base font-black">
              Đang phát hành
            </strong>
            <span
              className={`mt-0.5 block text-xs font-semibold ${
                activeTab === "published" ? "text-white/80" : "text-ink-500"
              }`}
            >
              Người học đang nhìn thấy
            </span>
          </span>
          <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-black">
            {publishedItems.length}
          </span>
        </button>
      </div>

      <section
        className="surface-card mt-5 overflow-hidden bg-white"
        role="tabpanel"
      >
        {activeItems.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title={
                activeTab === "waiting"
                  ? "Không có nội dung chờ phát hành"
                  : "Chưa có nội dung đang phát hành"
              }
              description={
                activeTab === "waiting"
                  ? "Nội dung sau khi được phê duyệt sẽ xuất hiện tại đây."
                  : "Nội dung được phát hành sẽ xuất hiện tại đây để bạn theo dõi hoặc tạm gỡ."
              }
            />
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {activeItems.map((item) => (
              <article
                key={item.id}
                className="flex flex-wrap items-center gap-5 p-6 transition hover:bg-slate-50/70"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-lg font-black">{item.title}</h2>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="mt-2 text-sm font-semibold text-ink-500">
                    {item.contentId} · phiên bản {item.version}
                  </p>
                </div>

                {activeTab === "waiting" ? (
                  <div className="flex flex-wrap justify-end gap-2">
                    <form action={revokeApproval}>
                      <input
                        type="hidden"
                        name="revisionId"
                        value={item.id}
                      />
                      <ConfirmSubmitButton
                        confirmation={`Hủy phê duyệt “${item.title}”? Nội dung sẽ quay lại Hàng chờ duyệt.`}
                        className="rounded-2xl border-2 border-slate-200 bg-white px-5 py-3 font-black text-ink-700 transition hover:border-amber-300 hover:bg-amber-50"
                      >
                        Hủy phê duyệt
                      </ConfirmSubmitButton>
                    </form>
                    <form action={publishRevision}>
                      <input
                        type="hidden"
                        name="revisionId"
                        value={item.id}
                      />
                      <input
                        type="hidden"
                        name="returnTo"
                        value="/quan-tri/phat-hanh"
                      />
                      <button className="rounded-2xl bg-gradient-to-r from-blue-700 to-sky-500 px-5 py-3 font-black text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg">
                        Phát hành ngay
                      </button>
                    </form>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setUnpublishItem(item)}
                    className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 font-black text-rose-700 transition hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-100"
                  >
                    Tạm gỡ
                  </button>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      {unpublishItem && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-5 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setUnpublishItem(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="unpublish-title"
            className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-600">
                  Xác nhận tạm gỡ
                </p>
                <h2 id="unpublish-title" className="mt-2 text-2xl font-black">
                  {unpublishItem.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-ink-600">
                  Bài sẽ ngừng hiển thị với người học. Dữ liệu và tiến độ đã
                  lưu không bị xóa.
                </p>
              </div>
              <button
                type="button"
                aria-label="Đóng hộp thoại"
                onClick={() => setUnpublishItem(null)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 font-black text-ink-600 hover:bg-slate-200"
              >
                ×
              </button>
            </div>

            <form action={unpublishRevision} className="mt-6">
              <input
                type="hidden"
                name="revisionId"
                value={unpublishItem.id}
              />
              <label
                htmlFor="unpublish-note"
                className="text-sm font-black text-ink-800"
              >
                Lý do tạm gỡ
              </label>
              <textarea
                id="unpublish-note"
                name="note"
                required
                minLength={3}
                autoFocus
                placeholder="Ví dụ: Audio phát âm chưa chính xác."
                className="mt-2 min-h-28 w-full rounded-2xl border-2 border-slate-200 px-4 py-3 font-semibold outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
              />
              <p className="mt-2 text-xs font-semibold text-ink-500">
                Ghi ngắn gọn để đội nội dung biết chính xác vấn đề cần xử lý.
              </p>
              <div className="mt-6 flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setUnpublishItem(null)}
                  className="rounded-2xl border-2 border-slate-200 bg-white px-5 py-3 font-black text-ink-700 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button className="rounded-2xl bg-rose-600 px-5 py-3 font-black text-white shadow-md transition hover:bg-rose-700">
                  Xác nhận tạm gỡ
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
