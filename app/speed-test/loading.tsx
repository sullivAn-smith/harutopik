export default function SpeedTestLoading() {
  return (
    <main
      className="min-h-dvh bg-[linear-gradient(145deg,#0a84c1,#063b77)] px-4 py-6 text-white sm:px-6 sm:py-10"
      aria-busy="true"
      aria-label="Đang tải Speed Test Arena"
    >
      <section className="mx-auto max-w-6xl animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-11 w-28 rounded-2xl bg-white/70" />
          <div className="h-11 w-32 rounded-2xl bg-white/20" />
        </div>
        <div className="mx-auto mt-12 h-10 max-w-md rounded-xl bg-white/25" />
        <div className="mx-auto mt-4 h-5 max-w-xl rounded-lg bg-white/15" />
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="min-h-72 rounded-[2rem] border border-white/15 bg-white/10" />
          ))}
        </div>
      </section>
    </main>
  );
}
