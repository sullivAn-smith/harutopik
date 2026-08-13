export default function AdminContentLoading() {
  return (
    <main
      className="mx-auto max-w-7xl animate-pulse px-5 py-10 lg:px-8"
      aria-label="Đang tải nội dung phát hành"
      aria-busy="true"
    >
      <div className="h-6 w-44 rounded-full bg-violet-100" />
      <div className="mt-5 h-11 w-96 max-w-full rounded-2xl bg-slate-200" />
      <div className="mt-4 h-5 w-[42rem] max-w-full rounded-xl bg-slate-100" />
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="h-24 rounded-3xl border border-slate-200 bg-white shadow-sm"
          />
        ))}
      </div>
      <div className="mt-6 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="flex items-center gap-4 border-b border-slate-100 px-6 py-5 last:border-0"
          >
            <div className="h-11 w-11 rounded-2xl bg-slate-100" />
            <div className="flex-1">
              <div className="h-5 w-1/3 rounded-lg bg-slate-200" />
              <div className="mt-2 h-4 w-1/2 rounded-lg bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
