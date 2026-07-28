import Link from "next/link";
import { clearAllNotifications, markAllNotificationsRead, markNotificationRead } from "@/features/notifications/actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { getCurrentActor } from "@/lib/auth/authorize";
import { getNotifications } from "@/lib/data/notifications";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ clear?: string }>;
}) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/dang-nhap?next=/thong-bao");
  const notifications = await getNotifications();
  const { clear } = await searchParams;
  const home = actor.roles.includes("admin")
    ? "/quan-tri"
    : actor.roles.includes("content_editor")
      ? "/bien-tap"
      : "/";
  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <Link href={home} className="font-black text-brand-700">← Quay lại</Link>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-black uppercase tracking-widest text-brand-600">Cập nhật công việc</p><h1 className="mt-2 text-4xl font-black">Thông báo</h1></div>
        <div className="flex flex-wrap gap-2">
          <form action={markAllNotificationsRead}><button className="rounded-xl border px-4 py-2 font-bold">Đánh dấu đã đọc tất cả</button></form>
          <form action={clearAllNotifications}>
            <ConfirmSubmitButton confirmation="Xóa toàn bộ thông báo? Thao tác này không thể hoàn tác." className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 font-bold text-red-800">Xóa tất cả</ConfirmSubmitButton>
          </form>
        </div>
      </div>
      {clear && <p role={clear === "error" ? "alert" : "status"} className={`mt-5 rounded-2xl p-4 font-bold ${clear === "error" ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`}>{clear === "error" ? "Chưa thể xóa thông báo. Vui lòng thử lại." : "Đã xóa toàn bộ thông báo."}</p>}
      <section className="mt-8 grid gap-3">
        {notifications.map((item) => (
          <form key={item.id} action={markNotificationRead} className={`rounded-2xl border p-5 ${item.read_at ? "bg-white" : "border-blue-300 bg-blue-50"}`}>
            <input type="hidden" name="notificationId" value={item.id} />
            <input type="hidden" name="href" value={item.href ?? ""} />
            <button className="w-full text-left">
              <div className="flex justify-between gap-4"><h2 className="font-black">{item.title}</h2><time className="text-xs text-ink-500">{new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(item.created_at))}</time></div>
              <p className="mt-2 text-ink-600">{item.message}</p>
              {item.href && <p className="mt-3 font-black text-brand-700">Mở nội dung →</p>}
            </button>
          </form>
        ))}
        {notifications.length === 0 && <p className="rounded-2xl bg-slate-100 p-8 text-center font-bold text-ink-600">Bạn chưa có thông báo nào.</p>}
      </section>
    </main>
  );
}
