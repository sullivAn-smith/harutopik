import Link from "next/link";
import { getManagedAccounts, getManagedAccountStats } from "@/lib/data/account-admin";

export default async function AccountManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; status?: string; plan?: string }>;
}) {
  const { q = "", role = "", status = "", plan = "" } = await searchParams;
  const selectedRole = ["learner", "content_editor", "admin"].includes(role)
    ? role as "learner" | "content_editor" | "admin"
    : undefined;
  const selectedStatus = ["active", "locked"].includes(status)
    ? status as "active" | "locked"
    : undefined;
  const selectedPlan = ["free", "pro"].includes(plan)
    ? plan as "free" | "pro"
    : undefined;
  const hasFilters = Boolean(q || selectedRole || selectedStatus || selectedPlan);
  const [accounts, stats] = await Promise.all([
    getManagedAccounts({ query: q, role: selectedRole, status: selectedStatus, plan: selectedPlan }),
    getManagedAccountStats(),
  ]);
  return (
    <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <p className="text-sm font-black uppercase tracking-widest text-cyan-700">Người dùng & phân quyền</p>
      <h1 className="mt-2 text-4xl font-black">Quản lý tài khoản</h1>
      <p className="mt-3 text-ink-600">Tìm người dùng, kiểm tra tình trạng học tập và quản lý một role vận hành chính.</p>
      <section aria-label="Thống kê người dùng" className="mt-7 grid gap-4 sm:grid-cols-3">
        <article className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#087eba] to-[#16a3d8] p-6 text-white shadow-[0_16px_34px_rgba(8,126,186,.24)]">
          <span className="absolute -right-6 -top-8 h-28 w-28 rounded-full bg-white/10" />
          <p className="text-xs font-black uppercase tracking-[.18em] text-cyan-100">Người đăng ký học</p>
          <p className="mt-3 text-4xl font-black tabular-nums">{stats.registeredLearners.toLocaleString("vi-VN")}</p>
          <p className="mt-2 text-sm font-semibold text-white/80">Tổng hồ sơ học viên đã tạo</p>
        </article>
        <article className="rounded-3xl border border-emerald-100 bg-emerald-50 p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[.18em] text-emerald-700">Learner hiện tại</p>
          <p className="mt-3 text-4xl font-black tabular-nums text-[#10243e]">{stats.currentLearners.toLocaleString("vi-VN")}</p>
          <p className="mt-2 text-sm font-semibold text-ink-600">Đang giữ role learner</p>
        </article>
        <article className="rounded-3xl border border-violet-100 bg-violet-50 p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[.18em] text-violet-700">Haru Pro</p>
          <p className="mt-3 text-4xl font-black tabular-nums text-[#10243e]">{stats.proLearners.toLocaleString("vi-VN")}</p>
          <p className="mt-2 text-sm font-semibold text-ink-600">Gói học đang hoạt động</p>
        </article>
      </section>
      <form className="surface-card mt-7 bg-white p-4">
        <div className="flex flex-col gap-3 xl:flex-row">
          <input name="q" defaultValue={q} placeholder="Tìm theo email hoặc tên..." className="min-w-0 flex-1 rounded-2xl border-2 border-slate-200 px-5 py-3 font-semibold outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-sky-100" />
          <div className="grid gap-3 sm:grid-cols-3 xl:flex">
            <label className="min-w-40">
              <span className="sr-only">Lọc theo role</span>
              <select name="role" defaultValue={selectedRole ?? ""} className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 font-bold text-ink-900 outline-none transition focus:border-brand-500">
                <option value="">Tất cả role</option>
                <option value="learner">Learner</option>
                <option value="content_editor">Content editor</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <label className="min-w-40">
              <span className="sr-only">Lọc theo trạng thái</span>
              <select name="status" defaultValue={selectedStatus ?? ""} className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 font-bold text-ink-900 outline-none transition focus:border-brand-500">
                <option value="">Mọi trạng thái</option>
                <option value="active">Hoạt động</option>
                <option value="locked">Đã khóa</option>
              </select>
            </label>
            <label className="min-w-36">
              <span className="sr-only">Lọc theo gói</span>
              <select name="plan" defaultValue={selectedPlan ?? ""} className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 font-bold text-ink-900 outline-none transition focus:border-brand-500">
                <option value="">Tất cả gói</option>
                <option value="free">Haru Free</option>
                <option value="pro">Haru Pro</option>
              </select>
            </label>
          </div>
          <button className="rounded-2xl bg-[#10243e] px-6 py-3 font-black text-white transition hover:bg-[#173d70]">Áp dụng</button>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 px-1">
          <p className="text-sm font-bold text-ink-600">Hiển thị {accounts.length.toLocaleString("vi-VN")} tài khoản phù hợp</p>
          {hasFilters && <Link href="/quan-tri/tai-khoan" className="text-sm font-black text-brand-700 hover:underline">Xóa tất cả bộ lọc ×</Link>}
        </div>
      </form>
      <section className="surface-card mt-6 overflow-x-auto bg-white">
        <table className="w-full min-w-[900px] text-left">
          <thead className="bg-slate-50 text-sm text-ink-600"><tr><th className="p-4">Tài khoản</th><th className="p-4">Role</th><th className="p-4">Trạng thái</th><th className="p-4">Tiến độ</th><th className="p-4">Gói</th><th className="p-4">Nội dung</th><th className="p-4"></th></tr></thead>
          <tbody className="divide-y">
            {accounts.map((account) => (
              <tr key={account.id}>
                <td className="p-4"><p className="font-black">{account.displayName}</p><p className="mt-1 text-sm text-ink-600">{account.email}</p></td>
                <td className="p-4"><span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-black text-blue-800">{account.role}</span></td>
                <td className="p-4"><span className={`rounded-full px-3 py-1 text-sm font-black ${account.isLocked ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`}>{account.isLocked ? "Đã khóa" : "Hoạt động"}</span></td>
                <td className="p-4 font-bold">{account.progress.completed}/{account.progress.total} bài</td>
                <td className="p-4 font-bold">{account.subscription}</td>
                <td className="p-4 font-bold">{account.contentCount}</td>
                <td className="p-4"><Link href={`/quan-tri/tai-khoan/${account.id}`} className="font-black text-brand-700">Chi tiết →</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
        {accounts.length === 0 && <p className="p-10 text-center font-bold text-ink-600">Không tìm thấy tài khoản phù hợp.</p>}
      </section>
    </main>
  );
}
