"use client";

import { useEffect } from "react";
import { reportClientEvent } from "@/lib/observability/client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientEvent({
      name: "route_error",
      path: window.location.pathname,
      properties: { digest: error.digest ?? "unknown" },
    });
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-5 text-center">
      <div>
        <p className="text-sm font-black uppercase tracking-widest text-brand-600">Có lỗi xảy ra</p>
        <h1 className="mt-3 text-3xl font-black">Haru chưa tải được trang này</h1>
        <p className="mt-3 text-ink-600">Tiến độ đã lưu của bạn vẫn an toàn. Hãy thử tải lại.</p>
        <button onClick={reset} className="mt-6 rounded-2xl bg-brand-600 px-5 py-3 font-black text-white">Thử lại</button>
      </div>
    </main>
  );
}
