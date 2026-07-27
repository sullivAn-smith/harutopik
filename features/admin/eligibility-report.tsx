import type { Lesson } from "@/content/schema";
import { evaluateLessonEligibility } from "@/lib/vocabulary/eligibility";

export function EligibilityReport({ lesson }: { lesson: Lesson }) {
  const report = evaluateLessonEligibility(lesson);
  return (
    <section className="surface-card bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase tracking-widest text-brand-600">Kiểm tra tự động</p>
          <h2 className="mt-2 text-2xl font-black">Dạng luyện tập khả dụng</h2>
          <p className="mt-2 text-sm leading-6 text-ink-600">Hệ thống tự đánh giá từ dữ liệu đã nhập; bạn không cần chọn mode cho từng từ.</p>
        </div>
        <span className={`rounded-full px-4 py-2 text-sm font-black ${report.canSubmit ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
          {report.canSubmit ? "Đủ điều kiện gửi duyệt" : "Cần hoàn thiện"}
        </span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {report.modes.map((mode) => (
          <article key={mode.mode} className={`rounded-2xl border p-4 ${mode.available ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-slate-50"}`}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-black">{mode.label}</h3>
              <span className={`text-xs font-black ${mode.available ? "text-emerald-700" : "text-slate-500"}`}>{mode.available ? "✓ Sẵn sàng" : "○ Chưa sẵn sàng"}</span>
            </div>
            <p className="mt-2 text-sm text-ink-600">{mode.requirement}</p>
            <p className="mt-2 text-xs font-bold text-ink-400">{mode.eligibleCount}/{mode.totalCount} nội dung phù hợp · {mode.source === "vocabulary" ? "Tự sinh từ từ vựng" : "Bài tập biên soạn"}</p>
            {mode.missing.map((message) => <p key={message} className="mt-2 text-xs font-bold text-amber-700">{message}</p>)}
          </article>
        ))}
      </div>
      {report.blockers.length > 0 && (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="font-black text-red-800">Cần sửa trước khi gửi duyệt</p>
          <ul className="mt-2 grid gap-1 text-sm font-semibold text-red-700">{report.blockers.map((item) => <li key={item}>• {item}</li>)}</ul>
        </div>
      )}
    </section>
  );
}
