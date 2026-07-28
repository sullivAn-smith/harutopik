import Link from "next/link";
import { getManagedAccounts } from "@/lib/data/account-admin";

export default async function AccountManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const accounts = await getManagedAccounts(q);
  return (
    <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <p className="text-sm font-black uppercase tracking-widest text-cyan-700">Người dùng & phân quyền</p>
      <h1 className="mt-2 text-4xl font-black">Quản lý tài khoản</h1>
      <p className="mt-3 text-ink-600">Tìm người dùng, kiểm tra tình trạng học tập và quản lý một role vận hành chính.</p>
      <form className="surface-card mt-7 flex gap-3 bg-white p-4">
        <input name="q" defaultValue={q} placeholder="Tìm theo email hoặc tên..." className="min-w-0 flex-1 rounded-2xl border-2 border-slate-200 px-5 py-3 font-semibold outline-none focus:border-brand-500" />
        <button className="rounded-2xl bg-[#10243e] px-6 py-3 font-black text-white">Tìm kiếm</button>
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
