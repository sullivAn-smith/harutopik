import Link from "next/link";
import { notFound } from "next/navigation";
import { changePrimaryRole, setAccountLock } from "@/features/admin/account-actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { getManagedAccountDetail } from "@/lib/data/account-admin";

export default async function AccountDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ role?: string; lock?: string; errorMessage?: string }>;
}) {
  const { userId } = await params;
  const [detail, notice] = await Promise.all([
    getManagedAccountDetail(userId),
    searchParams,
  ]);
  if (!detail) notFound();
  const { account } = detail;
  const hasError = notice.role === "error" || notice.role === "invalid" || ["error", "invalid", "self"].includes(notice.lock ?? "");
  return (
    <main className="mx-auto max-w-6xl px-5 py-10 lg:px-8">
      <Link href="/quan-tri/tai-khoan" className="font-black text-brand-700">← Danh sách tài khoản</Link>
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="text-4xl font-black">{account.displayName}</h1><p className="mt-2 text-ink-600">{account.email}</p></div>
        <span className={`rounded-full px-4 py-2 font-black ${account.isLocked ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"}`}>{account.isLocked ? "Đã khóa" : "Đang hoạt động"}</span>
      </div>
      {(notice.role || notice.lock) && <p role={hasError ? "alert" : "status"} className={`mt-6 rounded-2xl p-4 font-bold ${hasError ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`}>{notice.errorMessage ?? (notice.role === "updated" ? "Đã cập nhật role chính." : notice.lock === "self" ? "Bạn không thể tự khóa tài khoản đang đăng nhập." : notice.lock === "locked" ? "Đã khóa tài khoản." : notice.lock === "unlocked" ? "Đã mở khóa tài khoản." : "Dữ liệu chưa hợp lệ.")}</p>}
      <section className="mt-7 grid gap-4 sm:grid-cols-4">
        {[["Role hiện tại", account.role], ["Tiến độ", `${account.progress.completed}/${account.progress.total} bài`], ["Gói", account.subscription], ["Nội dung đã tạo", String(account.contentCount)]].map(([label, value]) => <article key={label} className="surface-card bg-white p-5"><p className="text-sm font-bold text-ink-600">{label}</p><p className="mt-2 text-xl font-black">{value}</p></article>)}
      </section>
      <div className="mt-7 grid gap-6 lg:grid-cols-2">
        <section className="surface-card bg-white p-6">
          <h2 className="text-2xl font-black">Thay đổi role</h2>
          <p className="mt-2 text-sm leading-6 text-ink-600">Mỗi tài khoản chỉ giữ một role chính. Hệ thống không cho xóa admin cuối cùng.</p>
          <form action={changePrimaryRole} className="mt-5 grid gap-4">
            <input type="hidden" name="userId" value={account.id} />
            <select name="role" defaultValue={account.role} className="rounded-2xl border-2 border-slate-200 px-4 py-3 font-bold"><option value="learner">learner</option><option value="content_editor">content_editor</option><option value="admin">admin</option></select>
            <textarea name="reason" required minLength={3} rows={3} placeholder="Lý do thay đổi quyền..." className="rounded-2xl border-2 border-slate-200 p-4" />
            <ConfirmSubmitButton confirmation={`Xác nhận đổi role của ${account.email}?`} className="rounded-2xl bg-blue-600 px-5 py-3 font-black text-white">Xác nhận thay đổi role</ConfirmSubmitButton>
          </form>
        </section>
        <section className="surface-card bg-white p-6">
          <h2 className="text-2xl font-black">{account.isLocked ? "Mở khóa tài khoản" : "Khóa tài khoản"}</h2>
          <p className="mt-2 text-sm leading-6 text-ink-600">{account.isLocked ? "Người dùng sẽ có thể đăng nhập trở lại." : "Người dùng sẽ bị chặn đăng nhập cho đến khi admin mở khóa."}</p>
          <form action={setAccountLock} className="mt-5 grid gap-4">
            <input type="hidden" name="userId" value={account.id} />
            <input type="hidden" name="action" value={account.isLocked ? "unlock" : "lock"} />
            <textarea name="reason" required minLength={3} rows={3} placeholder="Lý do thực hiện..." className="rounded-2xl border-2 border-slate-200 p-4" />
            <ConfirmSubmitButton confirmation={`${account.isLocked ? "Mở khóa" : "Khóa"} tài khoản ${account.email}?`} className={`rounded-2xl px-5 py-3 font-black text-white ${account.isLocked ? "bg-emerald-600" : "bg-red-600"}`}>{account.isLocked ? "Mở khóa tài khoản" : "Khóa tài khoản"}</ConfirmSubmitButton>
          </form>
        </section>
      </div>
      <section className="surface-card mt-7 bg-white p-6">
        <h2 className="text-2xl font-black">Nội dung đã tạo</h2>
        <div className="mt-4 grid gap-3">{detail.revisions.map((item) => <Link key={item.id} href={`/quan-tri/noi-dung/${item.id}`} className="flex justify-between gap-4 rounded-xl border p-4"><span><strong>{item.title}</strong><small className="mt-1 block text-ink-600">{item.contentId}</small></span><span className="font-bold">{item.status}</span></Link>)}{detail.revisions.length === 0 && <p className="text-ink-600">Tài khoản chưa tạo nội dung.</p>}</div>
      </section>
      <section className="surface-card mt-7 bg-white p-6">
        <h2 className="text-2xl font-black">Lịch sử thay đổi role</h2>
        <div className="mt-4 grid gap-3">{detail.history.map((item) => <article key={item.id} className="rounded-xl border p-4"><p className="font-black">{item.previous_roles.join(", ") || "chưa có"} → {item.new_role}</p><p className="mt-1 text-sm text-ink-600">{item.reason} · {new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(item.changed_at))}</p></article>)}{detail.history.length === 0 && <p className="text-ink-600">Chưa có thay đổi role nào được ghi nhận.</p>}</div>
      </section>
    </main>
  );
}
