"use client";

import Link from "next/link";
import { useState } from "react";
import type { ManagedAccount, ManagedAccountPage } from "@/lib/data/account-admin";

function formatLastStudied(value: string | null) {
  if (!value) return "Chưa học";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
  }).format(new Date(value));
}

export function ManagedAccountTable({
  initialPage,
  query,
  role,
  status,
  plan,
}: {
  initialPage: ManagedAccountPage;
  query: string;
  role?: string;
  status?: string;
  plan?: string;
}) {
  const [accounts, setAccounts] = useState<ManagedAccount[]>(
    initialPage.accounts,
  );
  const [totalCount] = useState(initialPage.totalCount);
  const [nextOffset, setNextOffset] = useState(initialPage.nextOffset);
  const [hasMore, setHasMore] = useState(initialPage.hasMore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadMore() {
    if (loading || !hasMore) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        offset: String(nextOffset),
        limit: "20",
      });
      if (query) params.set("q", query);
      if (role) params.set("role", role);
      if (status) params.set("status", status);
      if (plan) params.set("plan", plan);
      const response = await fetch(`/api/v1/admin/accounts?${params}`, {
        credentials: "same-origin",
        headers: { accept: "application/json" },
      });
      const payload = (await response.json().catch(() => null)) as {
        data?: ManagedAccountPage;
        error?: { message?: string };
      } | null;
      if (!response.ok || !payload?.data) {
        throw new Error(payload?.error?.message ?? "Chưa thể tải thêm tài khoản.");
      }
      setAccounts((current) => [...current, ...payload.data!.accounts]);
      setNextOffset(payload.data.nextOffset);
      setHasMore(payload.data.hasMore);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Chưa thể tải thêm tài khoản.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <section className="surface-card mt-6 overflow-x-auto bg-white">
        <table className="w-full min-w-[1080px] text-left">
          <thead className="bg-slate-50 text-sm text-ink-600">
            <tr>
              <th className="p-4">Tài khoản</th>
              <th className="p-4">Role</th>
              <th className="p-4">Trạng thái</th>
              <th className="p-4">Tiến độ</th>
              <th className="p-4">Gói</th>
              <th className="p-4">Nội dung</th>
              <th className="p-4" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {accounts.map((account) => (
              <tr key={account.id}>
                <td className="p-4">
                  <p className="font-black">{account.displayName}</p>
                  <p className="mt-1 text-sm text-ink-600">{account.email}</p>
                </td>
                <td className="p-4">
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-black text-blue-800">
                    {account.role}
                  </span>
                </td>
                <td className="p-4">
                  <span
                    className={`rounded-full px-3 py-1 text-sm font-black ${
                      account.isLocked
                        ? "bg-red-50 text-red-800"
                        : "bg-emerald-50 text-emerald-800"
                    }`}
                  >
                    {account.isLocked ? "Đã khóa" : "Hoạt động"}
                  </span>
                </td>
                <td className="min-w-64 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <strong>{account.progress.overallPercent}%</strong>
                    <span className="text-xs font-bold text-slate-500">
                      {account.progress.completed}/{account.progress.total} hoàn thành
                    </span>
                  </div>
                  <div
                    className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"
                    role="progressbar"
                    aria-label={`Tiến độ ${account.displayName}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={account.progress.overallPercent}
                  >
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600"
                      style={{ width: `${account.progress.overallPercent}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {account.progress.inProgress} đang học · gần nhất{" "}
                    {formatLastStudied(account.progress.lastStudiedAt)}
                  </p>
                </td>
                <td className="p-4 font-bold">{account.subscription}</td>
                <td className="p-4 font-bold">{account.contentCount}</td>
                <td className="p-4">
                  <Link
                    href={`/quan-tri/tai-khoan/${account.id}`}
                    className="font-black text-brand-700"
                  >
                    Chi tiết →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {accounts.length === 0 && (
          <p className="p-10 text-center font-bold text-ink-600">
            Không tìm thấy tài khoản phù hợp.
          </p>
        )}
      </section>
      <div className="mt-4 flex flex-col items-center justify-center gap-3">
        <p className="text-sm font-bold text-ink-600">
          Đang hiển thị {accounts.length.toLocaleString("vi-VN")}/
          {totalCount.toLocaleString("vi-VN")} tài khoản
        </p>
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-700">
            {error}
          </p>
        )}
        {hasMore && (
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loading}
            className="rounded-2xl border border-sky-200 bg-white px-6 py-3 font-black text-brand-700 shadow-sm transition hover:bg-sky-50 disabled:cursor-wait disabled:opacity-60"
          >
            {loading ? "Đang tải thêm..." : "Xem thêm 20 user"}
          </button>
        )}
      </div>
    </>
  );
}
