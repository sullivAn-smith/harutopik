import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-5 text-center">
      <div>
        <p className="text-sm font-black uppercase tracking-widest text-brand-600">
          404
        </p>
        <h1 className="mt-3 text-3xl font-black">Không tìm thấy trang này</h1>
        <p className="mt-3 text-ink-600">
          Nội dung có thể đã được chuyển sang một địa chỉ mới.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-2xl bg-brand-600 px-5 py-3 font-black text-white"
        >
          Về trang chủ
        </Link>
      </div>
    </main>
  );
}
