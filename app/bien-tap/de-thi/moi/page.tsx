import Link from "next/link";
import { createExamDraft } from "@/features/exams/actions";

export default async function NewExamPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const notice = await searchParams;
  return <main className="mx-auto max-w-3xl px-5 py-10">
    <Link href="/bien-tap/de-thi" className="font-black text-[#087eba]">← Ngân hàng đề</Link>
    <section className="mt-6 rounded-3xl bg-gradient-to-br from-[#10243e] to-[#087eba] p-8 text-white"><p className="text-xs font-black uppercase tracking-[.18em] text-cyan-200">Đề TOPIK mới</p><h1 className="mt-3 text-4xl font-black">Tạo khung đề</h1><p className="mt-3 text-blue-100">Tạo thông tin chung trước, sau đó biên soạn câu Nghe và Đọc.</p></section>
    {notice.error && <p className="mt-5 rounded-2xl bg-red-50 p-4 font-bold text-red-700">{notice.error}</p>}
    <form action={createExamDraft} className="mt-6 space-y-5 rounded-3xl bg-white p-7 shadow-sm">
      <label className="block font-black">Mã đề<input name="code" required placeholder="topik-i-nghe-01" className="mt-2 w-full rounded-2xl border px-4 py-3 font-semibold" /></label>
      <label className="block font-black">Tên đề<input name="title" required placeholder="Đề luyện nghe TOPIK I · Số 1" className="mt-2 w-full rounded-2xl border px-4 py-3 font-semibold" /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block font-black">Trình độ<select name="level" defaultValue="topik_i" className="mt-2 w-full rounded-2xl border px-4 py-3 font-semibold"><option value="topik_i">TOPIK I</option><option value="topik_ii">TOPIK II</option></select></label>
        <label className="block font-black">Xem đáp án<select name="answerReviewPolicy" defaultValue="immediate" className="mt-2 w-full rounded-2xl border px-4 py-3 font-semibold"><option value="immediate">Ngay sau khi nộp</option><option value="score_only">Chỉ xem điểm</option><option value="after_date">Sau ngày công bố</option><option value="never">Không công bố</option></select></label>
      </div>
      <label className="block font-black">Ngày công bố đáp án <span className="font-semibold text-slate-400">(chỉ cần khi chọn “Sau ngày công bố”)</span><input name="answerReviewAvailableAt" type="datetime-local" className="mt-2 w-full rounded-2xl border px-4 py-3 font-semibold" /><span className="mt-2 block text-xs font-semibold text-slate-500">Múi giờ Việt Nam (UTC+7). Bạn có thể thay đổi lại trong trang soạn đề.</span></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block font-black">Thời gian Nghe (phút)<input name="listeningDurationMinutes" type="number" min="1" max="180" defaultValue="40" className="mt-2 w-full rounded-2xl border px-4 py-3 font-semibold" /></label>
        <label className="block font-black">Thời gian Đọc (phút)<input name="readingDurationMinutes" type="number" min="1" max="180" defaultValue="60" className="mt-2 w-full rounded-2xl border px-4 py-3 font-semibold" /></label>
      </div>
      <button className="w-full rounded-2xl bg-[#087eba] px-5 py-3 font-black text-white">Tạo bản nháp và thêm câu →</button>
    </form>
  </main>;
}
