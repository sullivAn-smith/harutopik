import { AdminStreakPanel } from "@/features/streak/admin-streak-panel";
import { getCurrentActor } from "@/lib/auth/authorize";
import { getStreakAdminData } from "@/lib/data/streak-admin";

const successMessages: Record<string, string> = {
  "settings-saved": "Đã cập nhật quy tắc streak.",
  "shields-granted": "Đã tặng khiên thành công.",
};

export default async function StreakAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; message?: string }>;
}) {
  const { q = "", status = "", message = "" } = await searchParams;
  const actor = await getCurrentActor();
  if (!actor?.roles.includes("admin")) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16 lg:px-8">
        <section className="rounded-3xl border border-amber-200 bg-white p-8 shadow-[0_18px_50px_rgba(16,36,62,.1)]">
          <span className="text-4xl" aria-hidden="true">🛡</span>
          <h1 className="mt-4 text-3xl font-black text-[#10243e]">Cần quyền admin</h1>
          <p className="mt-3 leading-7 text-slate-600">Tài khoản hiện tại vào được khu vực duyệt nội dung nhưng chưa có role <strong>admin</strong>. Chỉ admin mới được đổi quy tắc streak và phân phối khiên.</p>
        </section>
      </main>
    );
  }
  let data: Awaited<ReturnType<typeof getStreakAdminData>>;
  try {
    data = await getStreakAdminData(q);
  } catch (error) {
    console.error("[streak-admin] Unable to load streak administration data", error);
    return (
      <main className="mx-auto max-w-3xl px-5 py-16 lg:px-8">
        <section className="rounded-3xl border border-cyan-200 bg-white p-8 shadow-[0_18px_50px_rgba(16,36,62,.1)]">
          <span className="text-4xl" aria-hidden="true">⚙️</span>
          <h1 className="mt-4 text-3xl font-black text-[#10243e]">Chưa cài dữ liệu streak</h1>
          <p className="mt-3 leading-7 text-slate-600">
            Route quản trị đã hoạt động, nhưng database chưa có đủ bảng hoặc quyền streak mới. Hãy chạy
            <code className="mx-1 rounded bg-slate-100 px-2 py-1 font-mono text-sm text-[#087eba]">npx supabase db push</code>
            rồi tải lại trang.
          </p>
        </section>
      </main>
    );
  }
  const notice = status === "error" ? message : message || successMessages[status];
  return (
    <main className="mx-auto max-w-[1500px] px-5 py-9 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div><span className="inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-black uppercase tracking-[.16em] text-orange-700">Daily motivation</span><h1 className="mt-4 text-4xl font-black tracking-tight">Streak & phần thưởng</h1><p className="mt-3 max-w-3xl leading-7 text-slate-600">Đặt quy tắc trên server, cấu hình nhắc học trong hệ thống và phân phối khiên cho người học.</p></div>
        <form className="flex min-w-[20rem] gap-2"><input name="q" defaultValue={q} placeholder="Tìm email hoặc tên..." className="min-w-0 flex-1 rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 font-semibold outline-none focus:border-cyan-500" /><button className="rounded-2xl bg-[#10243e] px-5 py-3 font-black text-white">Tìm</button></form>
      </div>
      {notice && <div className={`mt-6 rounded-2xl px-5 py-4 font-black ${status === "error" ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`}>{notice}</div>}
      <AdminStreakPanel {...data} />
    </main>
  );
}
