export default function ExamPreflightLoading() {
  return (
    <main className="elegant-blue min-h-screen px-5 py-10 text-[#10243e]" aria-busy="true" aria-label="Đang tải thông tin đề">
      <div className="mx-auto max-w-4xl animate-pulse">
        <div className="h-11 w-40 rounded-xl bg-white" />
        <section className="mt-6 overflow-hidden rounded-[2rem] bg-white shadow-xl">
          <div className="h-44 bg-sky-200" />
          <div className="p-7 md:p-9">
            <div className="mx-auto h-24 w-24 rounded-[2rem] bg-sky-50" />
            <div className="mt-7 grid gap-3 md:grid-cols-3">
              {Array.from({ length: 3 }, (_, index) => <div key={index} className="h-44 rounded-2xl bg-slate-100" />)}
            </div>
            <div className="mt-6 h-16 rounded-2xl bg-sky-50" />
          </div>
        </section>
      </div>
    </main>
  );
}
