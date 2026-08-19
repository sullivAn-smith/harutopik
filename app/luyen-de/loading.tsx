export default function ExamLibraryLoading() {
  return (
    <main className="elegant-blue min-h-screen px-5 py-8 text-[#10243e]" aria-busy="true" aria-label="Đang tải danh sách đề">
      <div className="mx-auto max-w-7xl animate-pulse">
        <div className="h-11 w-36 rounded-xl bg-white" />
        <section className="mt-7 h-64 rounded-[2.25rem] bg-sky-200/70" />
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => <div key={index} className="h-72 rounded-[2rem] bg-white/80" />)}
        </div>
      </div>
    </main>
  );
}
