import type { Metadata } from "next";
import Link from "next/link";
import { startProCheckout } from "@/features/billing/actions";
import { formatVnd, plans } from "@/lib/billing/plans";

export const metadata: Metadata = { title: "Nâng cấp Haru Pro" };

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const messages: Record<string, string> = {
    "setup-required": "Checkout đang chờ thông tin kênh thanh toán payOS.",
    processing: "Đang xác nhận giao dịch. Quyền Pro sẽ tự bật sau khi ngân hàng xác nhận.",
    cancelled: "Bạn đã hủy thanh toán. Không có khoản phí nào được ghi nhận.",
    error: "Chưa thể tạo phiên thanh toán. Vui lòng thử lại sau.",
  };
  const plan = plans.proAnnual;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#dff4ff,transparent_35rem),#f7fbff] px-5 py-10 text-ink-900">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="font-black text-brand-700">← Harutopik</Link>
        <section className="mt-10 text-center">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-600">Haru Pro</p>
          <h1 className="page-heading mt-3">Học trọn lộ trình, ôn đúng thời điểm</h1>
          <p className="body-lead mx-auto mt-5 max-w-2xl">Một quyền truy cập dùng chung trên website và ứng dụng Harutopik trong tương lai.</p>
        </section>

        {status && messages[status] && (
          <p role="status" className="mx-auto mt-7 max-w-2xl rounded-2xl bg-amber-50 px-5 py-4 text-center font-semibold text-amber-900">{messages[status]}</p>
        )}

        <section className="surface-card mx-auto mt-9 max-w-xl border-2 border-brand-500 bg-white p-7 sm:p-10">
          <div className="flex items-start justify-between gap-5">
            <div><p className="text-sm font-black text-brand-600">12 THÁNG</p><h2 className="mt-2 text-3xl font-black">{plan.name}</h2></div>
            <p className="text-right text-3xl font-black">{formatVnd(plan.price)}<span className="block text-sm font-semibold text-ink-600">/ năm</span></p>
          </div>
          <ul className="mt-7 space-y-3">
            {plan.features.map((feature) => <li key={feature} className="flex gap-3 font-semibold"><span className="text-emerald-600">✓</span>{feature}</li>)}
          </ul>
          <form action={startProCheckout} className="mt-8">
            <button className="w-full rounded-2xl bg-gradient-to-r from-brand-700 to-brand-500 px-6 py-4 font-black text-white shadow-lg shadow-sky-200">Nâng cấp an toàn qua payOS</button>
          </form>
          <p className="mt-4 text-center text-xs leading-5 text-ink-600">Thanh toán một lần, không tự động gia hạn. Quyền học chỉ được kích hoạt sau xác nhận bảo mật từ payOS.</p>
        </section>
      </div>
    </main>
  );
}
