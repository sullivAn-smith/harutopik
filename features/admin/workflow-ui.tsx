import type { ReactNode } from "react";

export const workflowLabels: Record<string, string> = {
  draft: "Bản nháp",
  changes_requested: "Cần chỉnh sửa",
  in_review: "Chờ duyệt",
  approved: "Đã duyệt",
  published: "Đang phát hành",
  unpublished: "Đã tạm gỡ",
  archived: "Đã lưu trữ",
};

const statusStyles: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  changes_requested: "bg-amber-100 text-amber-800",
  in_review: "bg-blue-100 text-blue-800",
  approved: "bg-emerald-100 text-emerald-800",
  published: "bg-violet-100 text-violet-800",
  unpublished: "bg-rose-100 text-rose-800",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${statusStyles[status] ?? "bg-slate-100 text-slate-700"}`}>
      {workflowLabels[status] ?? status}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">✓</div>
      <h2 className="mt-4 text-xl font-black">{title}</h2>
      <p className="mx-auto mt-2 max-w-md leading-7 text-ink-600">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
