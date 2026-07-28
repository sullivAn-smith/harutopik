import Link from "next/link";
import { enqueueMissingVocabularyAudio } from "@/features/audio-admin/actions";
import { getAudioDashboard } from "@/lib/data/audio-admin";

const statusLabel: Record<string, string> = {
  queued: "Đang chờ",
  processing: "Đang xử lý",
  completed: "Hoàn tất",
  failed: "Lỗi",
};

export default async function AudioDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ queued?: string; error?: string }>;
}) {
  const [dashboard, query] = await Promise.all([
    getAudioDashboard(),
    searchParams,
  ]);
  return (
    <main className="mx-auto max-w-7xl px-5 py-10">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-sm font-black uppercase tracking-widest text-violet-700">
            Media pipeline
          </p>
          <h1 className="mt-2 text-4xl font-black">Audio từ vựng</h1>
          <p className="mt-3 max-w-2xl text-ink-600">
            Tạo một lần trong CMS, lưu vào Supabase Storage và phát trực tiếp từ
            CDN trên website lẫn ứng dụng.
          </p>
        </div>
        <form action={enqueueMissingVocabularyAudio}>
          <button
            disabled={dashboard.missing === 0}
            className="rounded-2xl bg-violet-700 px-6 py-3 font-black text-white disabled:bg-slate-300"
          >
            Xếp hàng {dashboard.missing} audio còn thiếu
          </button>
        </form>
      </div>
      {query.queued !== undefined && (
        <p className="mt-6 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-800">
          Đã xếp hàng {query.queued} audio. Worker sẽ xử lý tuần tự để tránh quá
          tải và vượt quota TTS.
        </p>
      )}
      {query.error === "not-configured" && (
        <p className="mt-6 rounded-2xl bg-amber-50 p-4 font-bold text-amber-900">
          Chưa có GOOGLE_CLOUD_TTS_API_KEY trong môi trường server.
        </p>
      )}
      {query.error && query.error !== "not-configured" && (
        <p role="alert" className="mt-6 rounded-2xl bg-red-50 p-4 font-bold text-red-800">
          {query.error}
        </p>
      )}
      <section className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Từ đang quản lý", dashboard.total],
          ["Audio sẵn sàng", dashboard.ready],
          ["Còn thiếu", dashboard.missing],
          ["Job lỗi", dashboard.failed],
        ].map(([label, value]) => (
          <div key={String(label)} className="surface-card bg-white p-5">
            <p className="text-sm font-bold text-ink-600">{label}</p>
            <p className="mt-2 text-3xl font-black">{value}</p>
          </div>
        ))}
      </section>
      <section className="surface-card mt-7 overflow-hidden bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
          <div>
            <h2 className="text-xl font-black">100 job gần nhất</h2>
            <p className="mt-1 text-sm text-ink-600">
              Đang chờ: {dashboard.queued} · Đang xử lý: {dashboard.processing}
            </p>
          </div>
          <Link href="/bien-tap/tu-vung" className="font-black text-brand-700">
            Mở thư viện từ →
          </Link>
        </div>
        <div className="divide-y">
          {dashboard.jobs.length === 0 ? (
            <p className="p-8 text-center font-semibold text-ink-600">
              Chưa có audio job nào.
            </p>
          ) : (
            dashboard.jobs.map((job) => (
              <article
                key={job.id}
                className="flex flex-wrap items-center justify-between gap-4 p-5"
              >
                <div>
                  <Link
                    href={`/bien-tap/tu-vung/${job.vocabulary_id}`}
                    lang="ko"
                    className="text-xl font-black hover:text-brand-700"
                  >
                    {job.source_text}
                  </Link>
                  <p className="mt-1 text-xs font-semibold text-ink-600">
                    {job.voice} · lần thử {job.attempts}/3
                  </p>
                  {job.error_message && (
                    <p className="mt-2 max-w-2xl text-sm font-semibold text-red-700">
                      {job.error_message}
                    </p>
                  )}
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ${
                    job.status === "completed"
                      ? "bg-emerald-100 text-emerald-800"
                      : job.status === "failed"
                        ? "bg-red-100 text-red-800"
                        : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {statusLabel[job.status] ?? job.status}
                </span>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
