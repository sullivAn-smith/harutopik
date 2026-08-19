export default function LeaderboardLoading() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_8%_12%,rgba(56,189,248,.16),transparent_28rem),radial-gradient(circle_at_92%_18%,rgba(251,191,36,.13),transparent_26rem),linear-gradient(135deg,#edf8ff_0%,#f8fbff_48%,#fff8ea_100%)] px-4 py-5 sm:px-6 sm:py-7">
      <div className="mx-auto max-w-6xl animate-pulse">
        <div className="h-36 rounded-[1.75rem] border border-sky-300/20 bg-[#0c4f7f]" />
        <div className="mt-4 h-14 rounded-2xl border border-white bg-white/80" />
        <div className="mt-5 h-[18rem] rounded-[1.75rem] border border-white bg-white/80" />
        <div className="mt-5 h-[24rem] rounded-[1.75rem] border border-white bg-white/80" />
      </div>
    </main>
  );
}
