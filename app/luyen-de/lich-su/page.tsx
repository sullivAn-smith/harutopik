import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentActor } from "@/lib/auth/authorize";
import { getUserExamHistorySummary } from "@/lib/data/exams";
import { ExamLibraryTabs } from "@/features/exams/exam-library-tabs";

export const dynamic = "force-dynamic";

export default async function ExamHistoryPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/dang-nhap?next=/luyen-de/lich-su");
  const history = await getUserExamHistorySummary(actor.id);
  return (
    <main className="elegant-blue min-h-screen text-[#10243e]">
      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4"><div><Link href="/" className="inline-flex items-center rounded-xl border border-[#10243e]/15 bg-white px-4 py-2.5 font-black text-[#10243e] shadow-sm transition hover:-translate-x-1 hover:border-[#10243e]/30">← Trang chủ</Link><h1 className="mt-3 text-4xl font-black md:text-5xl">Lịch sử luyện đề</h1><p className="mt-2 font-semibold text-slate-600">Mỗi đề được gom gọn theo toàn bộ các lần bạn đã làm.</p></div><ExamLibraryTabs active="history" /></div>
        <section className="mt-8 overflow-hidden rounded-3xl border border-white/80 bg-white/80 shadow-xl backdrop-blur">
          <div className="hidden grid-cols-[minmax(0,2fr)_120px_150px_150px_150px] gap-4 border-b bg-slate-50 px-6 py-4 text-sm font-black text-slate-500 md:grid"><span>Đề thi</span><span>Số lần làm</span><span>Điểm cao nhất</span><span>Lần gần nhất</span><span>Thao tác</span></div>
          <div className="divide-y">{history.map((item) => <article key={item.exam_id} className="grid gap-4 px-6 py-5 md:grid-cols-[minmax(0,2fr)_120px_150px_150px_150px] md:items-center"><div className="min-w-0"><span className="text-xs font-black uppercase tracking-wider text-[#087eba]">{item.level === "topik_ii" ? "TOPIK II" : "TOPIK I"} · {item.code}</span><h2 className="mt-1 truncate text-lg font-black">{item.title}</h2></div><Link href={`/luyen-de/${item.exam_id}/lich-su`} className="font-black text-[#087eba]">{item.attempt_count} lần</Link><strong>{item.best_score}/{item.best_max_score}</strong><time className="font-semibold text-slate-500">{new Date(item.last_attempt_at).toLocaleDateString("vi-VN")}</time><Link href={`/luyen-de/${item.exam_id}/lich-su`} className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-center font-black text-[#087eba]">Xem lịch sử</Link></article>)}</div>
          {!history.length && <p className="p-10 text-center font-bold text-slate-500">Bạn chưa hoàn thành đề thi nào.</p>}
        </section>
      </div>
    </main>
  );
}
