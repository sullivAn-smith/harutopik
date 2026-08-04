import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getCurrentActor } from "@/lib/auth/authorize";
import { getExamAttempt } from "@/lib/data/exams";
import { examAttemptModeLabel, examAttemptModeSchema } from "@/lib/exams/attempt-mode";
import { ExamResultHighlights } from "@/features/exams/exam-result-highlights";

type ResultHighlight = {
  id: string;
  selected_text: string;
  color: string;
  review_list_id: string | null;
};

export default async function ExamResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ examId: string }>;
  searchParams: Promise<{ attempt?: string }>;
}) {
  const [{ examId }, query, actor] = await Promise.all([
    params,
    searchParams,
    getCurrentActor(),
  ]);
  if (!actor) redirect("/dang-nhap");
  if (!query.attempt) notFound();
  const attempt = await getExamAttempt(query.attempt, actor.id);
  if (!attempt || attempt.exam_id !== examId || attempt.status === "in_progress") notFound();

  const answers = (attempt.answers ?? {}) as Record<string, number>;
  const questions = Array.isArray(attempt.question_snapshot)
    ? attempt.question_snapshot as Array<Record<string, unknown>>
    : [];
  const availableSections = (["listening", "reading"] as const).filter(
    (section) => questions.some((question) => question.section === section),
  );
  const parsedMode = examAttemptModeSchema.safeParse(attempt.attempt_mode);
  const attemptMode = parsedMode.success
    ? parsedMode.data
    : availableSections.length === 2
      ? "full"
      : availableSections[0] ?? "full";
  const maximumScore = attemptMode === "full" ? 200 : 100;
  const highlights = Array.isArray(attempt.exam_highlights)
    ? attempt.exam_highlights as ResultHighlight[]
    : [];

  return (
    <main className="elegant-blue min-h-screen text-[#10243e]">
      <div className="mx-auto max-w-5xl px-5 py-10">
        <Link href="/luyen-de" className="font-black text-[#087eba]">← Danh sách đề</Link>
        <section className="mt-6 rounded-[2rem] bg-white p-8 shadow-2xl">
          <p className="text-xs font-black uppercase tracking-[.2em] text-emerald-600">Đã hoàn thành · {examAttemptModeLabel(attemptMode)}</p>
          <h1 className="mt-2 text-4xl font-black">Kết quả bài thi</h1>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {availableSections.includes("listening") && <Result value={`${attempt.listening_score ?? 0}/100`} label="Điểm Nghe" />}
            {availableSections.includes("reading") && <Result value={`${attempt.reading_score ?? 0}/100`} label="Điểm Đọc" />}
            <Result value={`${attempt.score ?? 0}/${maximumScore}`} label="Tổng điểm" />
            <Result value={`${attempt.correct_count ?? 0}/${attempt.total_questions}`} label="Câu đúng" />
            <Result value={`${attempt.window_leave_count ?? 0}`} label="Lần rời cửa sổ" />
          </div>
          {attempt.window_leave_count > 0 && (
            <p className="mt-5 rounded-2xl bg-red-50 p-4 font-bold text-red-700">
              Hệ thống đã ghi nhận {attempt.window_leave_count} lần bạn rời khỏi cửa sổ thi. Chỉ số này không tự động trừ điểm.
            </p>
          )}
        </section>

        {highlights.length > 0 && (
          <ExamResultHighlights
            attemptId={attempt.id}
            initialHighlights={highlights.map((highlight) => ({
              id: highlight.id,
              selectedText: highlight.selected_text,
              color: highlight.color,
              reviewListId: highlight.review_list_id,
            }))}
          />
        )}

        {availableSections.map((section) => (
          <section key={section} className="mt-7">
            <h2 className="text-2xl font-black">Phần {section === "listening" ? "Nghe" : "Đọc"}</h2>
            <div className="mt-4 space-y-3">
              {questions.filter((question) => question.section === section).map((question, index) => {
                const id = String(question.id);
                const correct = Number(question.correct_option);
                const selected = answers[id];
                const explanation = String(question.explanation ?? "");
                const options = Array.isArray(question.options) ? question.options.map(String) : [];
                const optionImages = Array.isArray(question.option_images) ? question.option_images.map(String) : [];
                return (
                  <article key={id} className={`rounded-2xl border bg-white p-5 ${selected === correct ? "border-emerald-200" : "border-red-200"}`}>
                    <div className="flex items-center justify-between">
                      <h3 className="font-black">Câu {index + 1}</h3>
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${selected === correct ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                        {selected === correct ? "Đúng" : selected ? "Sai" : "Bỏ trống"}
                      </span>
                    </div>
                    {question.answer_type === "image" && optionImages.length > 0 && (
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        {optionImages.map((url, optionIndex) => url && (
                          <div key={`${url}-${optionIndex}`} className={`rounded-xl border p-2 ${optionIndex + 1 === correct ? "border-emerald-400" : "border-slate-200"}`}>
                            <Image unoptimized src={url} alt={`Đáp án ${optionIndex + 1}`} width={240} height={160} className="h-32 w-full rounded-lg object-contain" />
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="mt-2 font-semibold text-slate-600">Bạn chọn: {selected ? `${selected}. ${options[selected - 1] ?? ""}` : "Chưa trả lời"}</p>
                    <p className="mt-1 font-bold text-emerald-700">Đáp án: {correct}. {options[correct - 1] ?? ""}</p>
                    {explanation && <p className="mt-2 text-sm text-slate-500">{explanation}</p>}
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}

function Result({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-sky-50 p-5 text-center">
      <strong className="block text-3xl text-[#087eba]">{value}</strong>
      <span className="text-sm font-bold text-slate-500">{label}</span>
    </div>
  );
}
