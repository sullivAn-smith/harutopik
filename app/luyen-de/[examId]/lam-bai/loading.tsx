export default function ExamRunnerLoading() {
  return (
    <main
      className="min-h-screen bg-slate-100 px-5 py-6 text-[#10243e] sm:py-10"
      aria-busy="true"
      aria-label="Đang chuẩn bị đề"
    >
      <section className="mx-auto max-w-7xl animate-pulse">
        <div className="flex items-center justify-between gap-4">
          <div className="h-11 w-36 rounded-2xl bg-white" />
          <div className="h-11 w-28 rounded-2xl bg-sky-100" />
        </div>
        <div className="mt-6 overflow-hidden rounded-[2rem] bg-white shadow-sm">
          <header className="border-b border-slate-100 p-6 sm:p-8">
            <div className="h-4 w-24 rounded-full bg-sky-200" />
            <div className="mt-4 h-9 max-w-md rounded-xl bg-slate-200" />
            <div className="mt-3 h-5 w-48 rounded-lg bg-slate-100" />
          </header>
          <div className="grid gap-5 p-6 lg:grid-cols-[220px_minmax(0,1fr)] sm:p-8">
            <aside className="grid grid-cols-5 gap-2 lg:grid-cols-1">
              {Array.from({ length: 10 }, (_, index) => (
                <div key={index} className="h-11 rounded-xl bg-slate-100" />
              ))}
            </aside>
            <article className="rounded-3xl border border-slate-100 p-6">
              <div className="h-6 w-36 rounded-lg bg-slate-200" />
              <div className="mt-7 h-8 max-w-2xl rounded-lg bg-slate-100" />
              <div className="mt-3 h-8 max-w-xl rounded-lg bg-slate-100" />
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }, (_, index) => (
                  <div key={index} className="h-16 rounded-2xl bg-sky-50" />
                ))}
              </div>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}
