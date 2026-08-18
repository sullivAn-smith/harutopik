export default function LessonSpeedTestLoading() {
  return (
    <main
      className="grid min-h-dvh place-items-center bg-slate-950 p-6 text-white"
      aria-busy="true"
      aria-label="Đang chuẩn bị Speed Test"
    >
      <div className="text-center">
        <div className="mx-auto h-14 w-14 animate-pulse rounded-full bg-cyan-300" />
        <p className="mt-5 text-lg font-black">Đang chuẩn bị Speed Test…</p>
        <p className="mt-2 text-sm font-semibold text-sky-100/75">
          Đang tải bài học và trạng thái thử thách.
        </p>
      </div>
    </main>
  );
}
