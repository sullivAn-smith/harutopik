export default function LessonLoading() {
  return (
    <main className="min-h-screen bg-[#eef7fc] px-5 py-6 text-[#10243e]" aria-label="Đang tải bài học">
      <div className="mx-auto max-w-7xl animate-pulse">
        <div className="flex items-center justify-between gap-4">
          <div className="h-11 w-36 rounded-2xl bg-white/80" />
          <div className="h-11 w-44 rounded-2xl bg-sky-100" />
        </div>
        <section className="mt-6 overflow-hidden rounded-[2rem] bg-white shadow-sm">
          <div className="border-b border-slate-100 p-6 md:p-8">
            <div className="h-4 w-28 rounded-full bg-sky-200" />
            <div className="mt-4 h-9 max-w-md rounded-xl bg-slate-200" />
            <div className="mt-3 h-5 max-w-2xl rounded-lg bg-slate-100" />
          </div>
          <div className="grid gap-5 p-6 md:grid-cols-[240px_minmax(0,1fr)] md:p-8">
            <aside className="space-y-3 rounded-3xl bg-slate-50 p-4">
              {Array.from({ length: 6 }, (_, index) => <div key={index} className="h-12 rounded-2xl bg-white" />)}
            </aside>
            <div className="rounded-3xl border border-slate-100 p-6">
              <div className="h-6 w-40 rounded-lg bg-slate-200" />
              <div className="mt-6 h-72 rounded-3xl bg-gradient-to-br from-sky-50 to-slate-100" />
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="h-14 rounded-2xl bg-slate-100" />
                <div className="h-14 rounded-2xl bg-slate-100" />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
