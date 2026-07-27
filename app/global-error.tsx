"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="vi">
      <body>
        <main className="grid min-h-screen place-items-center bg-slate-50 px-5 text-center">
          <div>
            <h1 className="text-3xl font-black">Harutopik đang tạm gián đoạn</h1>
            <p className="mt-3 text-slate-600">
              Hãy thử lại. Dữ liệu học đã đồng bộ của bạn vẫn an toàn.
            </p>
            <button
              onClick={reset}
              className="mt-6 rounded-2xl bg-blue-700 px-5 py-3 font-bold text-white"
            >
              Thử lại
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
