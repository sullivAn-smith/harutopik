"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ExamSummary } from "@/lib/exams/types";
import type { ExamHistorySummary } from "@/lib/data/exams";

type LevelFilter = "all" | "topik_i" | "topik_ii";

type ExamLibraryGridProps = {
  exams: ExamSummary[];
  history: ExamHistorySummary[];
  historyPending?: boolean;
};

const filters: Array<{ value: LevelFilter; label: string }> = [
  { value: "all", label: "Tất cả" },
  { value: "topik_i", label: "TOPIK I" },
  { value: "topik_ii", label: "TOPIK II" },
];

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("vi")
    .trim();
}

function clampScore(score: number, maximum: number) {
  if (maximum <= 0) return 0;
  return Math.min(100, Math.max(0, (score / maximum) * 100));
}

export function ExamLibraryGrid({ exams, history, historyPending = false }: ExamLibraryGridProps) {
  const [level, setLevel] = useState<LevelFilter>("all");
  const [query, setQuery] = useState("");
  const historyByExam = useMemo(
    () => new Map(history.map((item) => [item.exam_id, item])),
    [history],
  );
  const normalizedQuery = normalizeSearch(query);
  const visibleExams = useMemo(
    () =>
      exams.filter((exam) => {
        const matchesLevel = level === "all" || exam.level === level;
        const searchable = normalizeSearch(
          `${exam.title} ${exam.code} ${exam.description}`,
        );
        return matchesLevel && (!normalizedQuery || searchable.includes(normalizedQuery));
      }),
    [exams, level, normalizedQuery],
  );

  const resetFilters = () => {
    setLevel("all");
    setQuery("");
  };

  return (
    <section className="mt-8" aria-labelledby="exam-library-heading">
      <div className="rounded-[2rem] border border-white/80 bg-white/72 p-4 shadow-[0_18px_50px_rgba(8,126,186,.12)] backdrop-blur-xl sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2" aria-label="Lọc theo cấp độ">
            {filters.map((filter) => {
              const selected = level === filter.value;
              return (
                <button
                  key={filter.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setLevel(filter.value)}
                  className={`min-w-24 rounded-2xl px-5 py-3 text-sm font-black transition sm:text-base ${
                    selected
                      ? "bg-gradient-to-r from-[#087eba] to-[#16a9db] text-white shadow-[0_8px_20px_rgba(8,126,186,.24)]"
                      : "border border-sky-100 bg-white text-slate-500 hover:border-sky-300 hover:bg-sky-50 hover:text-[#087eba]"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>

          <label className="group flex min-h-12 w-full items-center gap-3 rounded-2xl border border-sky-100 bg-white px-4 shadow-sm transition focus-within:border-sky-400 focus-within:ring-4 focus-within:ring-sky-100 xl:max-w-md">
            <span className="sr-only">Tìm đề thi</span>
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0 fill-none stroke-slate-400 stroke-2 transition group-focus-within:stroke-[#087eba]">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm theo tên hoặc mã đề..."
              className="min-w-0 flex-1 bg-transparent py-3 font-semibold text-[#10243e] outline-none placeholder:text-slate-400"
            />
          </label>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-sky-100 px-1 pt-4">
          <h2 id="exam-library-heading" className="font-black text-[#10243e]">
            {visibleExams.length} đề phù hợp
          </h2>
          {(level !== "all" || query) && (
            <button type="button" onClick={resetFilters} className="text-sm font-black text-[#087eba] hover:underline">
              Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {visibleExams.map((exam) => {
          const best = historyByExam.get(exam.id);
          const percentage = best ? clampScore(best.best_score, best.best_max_score) : 0;
          const isTopikTwo = exam.level === "topik_ii";

          return (
            <article
              key={exam.id}
              className="group relative flex min-h-[22rem] flex-col overflow-hidden rounded-[1.75rem] border border-white/90 bg-white/90 p-6 shadow-[0_14px_35px_rgba(16,36,62,.1)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_48px_rgba(8,126,186,.18)]"
            >
              <div className={`absolute inset-x-0 top-0 h-1.5 ${isTopikTwo ? "bg-gradient-to-r from-indigo-500 to-violet-400" : "bg-gradient-to-r from-sky-500 to-cyan-400"}`} />
              <div className="flex items-start justify-between gap-3">
                <span className={`rounded-xl px-3 py-1.5 text-xs font-black tracking-wide ${isTopikTwo ? "bg-violet-100 text-violet-700" : "bg-sky-100 text-sky-700"}`}>
                  {isTopikTwo ? "TOPIK II" : "TOPIK I"}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-500">
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                  {exam.durationMinutes} phút
                </span>
              </div>

              <p className="mt-5 text-xs font-black uppercase tracking-[.14em] text-slate-400">{exam.code}</p>
              <h3 className="mt-2 line-clamp-2 text-2xl font-black leading-tight text-[#10243e]">{exam.title}</h3>
              {exam.description && <p className="mt-3 line-clamp-2 text-sm font-medium leading-6 text-slate-500">{exam.description}</p>}

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-sky-50 px-4 py-3">
                  <span className="block text-xs font-bold text-slate-500">Phần nghe</span>
                  <strong className="mt-1 block text-lg text-[#087eba]">{exam.listeningQuestionCount} câu</strong>
                </div>
                <div className="rounded-2xl bg-cyan-50 px-4 py-3">
                  <span className="block text-xs font-bold text-slate-500">Phần đọc</span>
                  <strong className="mt-1 block text-lg text-[#087eba]">{exam.readingQuestionCount} câu</strong>
                </div>
              </div>

              <div className="mt-auto pt-6">
                {historyPending ? (
                  <div className="flex min-h-[3.25rem] animate-pulse items-center rounded-2xl bg-slate-50 px-4" aria-label="Đang tải điểm cao nhất">
                    <span className="h-4 w-32 rounded-full bg-slate-200" />
                  </div>
                ) : best ? (
                  <div aria-label={`Điểm cao nhất ${best.best_score} trên ${best.best_max_score}`}>
                    <div className="flex items-end justify-between gap-3 text-sm">
                      <span className="font-bold text-slate-500">Điểm cao nhất</span>
                      <strong className="text-base text-emerald-700">{best.best_score}/{best.best_max_score}</strong>
                    </div>
                    <div
                      role="progressbar"
                      aria-label={`Điểm cao nhất ${best.best_score} trên ${best.best_max_score}`}
                      aria-valuemin={0}
                      aria-valuemax={best.best_max_score}
                      aria-valuenow={best.best_score}
                      className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100"
                    >
                      <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                ) : (
                  <div className="flex min-h-[3.25rem] items-center rounded-2xl bg-slate-50 px-4">
                    <span className="text-sm font-semibold italic text-slate-400">Chưa làm đề này</span>
                  </div>
                )}

                <Link
                  href={`/luyen-de/${exam.id}`}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#087eba] to-[#159dd0] px-5 py-3.5 font-black text-white shadow-[0_9px_20px_rgba(8,126,186,.22)] transition group-hover:shadow-[0_12px_25px_rgba(8,126,186,.3)]"
                >
                  Làm đề <span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>
          );
        })}
      </div>

      {!visibleExams.length && (
        <div className="mt-5 rounded-[2rem] border-2 border-dashed border-sky-200 bg-white/75 p-10 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-2xl" aria-hidden="true">⌕</div>
          <h3 className="mt-4 text-xl font-black text-[#10243e]">Không tìm thấy đề phù hợp</h3>
          <p className="mt-2 font-medium text-slate-500">Hãy thử từ khóa khác hoặc xem tất cả cấp độ.</p>
          <button type="button" onClick={resetFilters} className="mt-5 rounded-2xl bg-[#087eba] px-5 py-3 font-black text-white">Xem tất cả đề</button>
        </div>
      )}
    </section>
  );
}
