export default function Loading() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50" aria-busy="true" aria-label="Đang tải nội dung">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-pulse rounded-full bg-brand-500" />
        <p className="mt-4 font-bold text-ink-600">Haru đang chuẩn bị bài học…</p>
      </div>
    </main>
  );
}
