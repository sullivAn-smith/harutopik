export default function LeaderboardLoading() {
  return (
    <main className="min-h-screen bg-[linear-gradient(105deg,#edf9ff_0%,#ffffff_48%,#fff9e9_100%)] px-4 py-5 sm:px-6 sm:py-7">
      <div className="mx-auto max-w-6xl animate-pulse">
        <div className="h-44 rounded-[1.75rem] border border-white bg-white/80" />
        <div className="mt-4 h-14 rounded-2xl border border-white bg-white/80" />
        <div className="mt-5 h-[23rem] rounded-[1.75rem] border border-white bg-white/80" />
        <div className="mt-5 h-[28rem] rounded-[1.75rem] border border-white bg-white/80" />
      </div>
    </main>
  );
}
