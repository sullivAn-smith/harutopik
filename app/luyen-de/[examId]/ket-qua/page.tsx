import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getCurrentActor } from "@/lib/auth/authorize";
import { getExamAttempt } from "@/lib/data/exams";
import { examAttemptModeLabel, examAttemptModeSchema } from "@/lib/exams/attempt-mode";
import { ExamResultHighlights } from "@/features/exams/exam-result-highlights";
import { ExamResultAudioPlayer } from "@/features/exams/exam-result-audio-player";

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
  searchParams: Promise<{ attempt?: string; section?: string; filter?: string }>;
}) {
  const [{ examId }, query, actor] = await Promise.all([
    params,
    searchParams,
    getCurrentActor(),
  ]);
  if (!actor) redirect(`/dang-nhap?next=${encodeURIComponent(`/luyen-de/${examId}`)}`);
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
  const activeSection = query.section === "reading" && availableSections.includes("reading")
    ? "reading"
    : availableSections[0] ?? "listening";
  const activeFilter = ["issues", "wrong", "blank", "correct", "all"].includes(query.filter ?? "") ? query.filter! : "issues";
  const listeningQuestionCount = questions.filter((question) => question.section === "listening").length;
  const readingQuestionCount = questions.filter((question) => question.section === "reading").length;
  const readingOffset = listeningQuestionCount === 30 && readingQuestionCount === 40 ? 30 : 0;
  const sectionQuestions = questions.filter((question) => question.section === activeSection).sort((left, right) => Number(left.position) - Number(right.position));
  const questionCountFor = (section: string) => questions.filter((question) => question.section === section).length;
  const statusOf = (question: Record<string, unknown>) => {
    const selected = answers[String(question.id)];
    if (!selected) return "blank" as const;
    return selected === Number(question.correct_option) ? "correct" as const : "wrong" as const;
  };
  const counts = {
    all: sectionQuestions.length,
    correct: sectionQuestions.filter((question) => statusOf(question) === "correct").length,
    wrong: sectionQuestions.filter((question) => statusOf(question) === "wrong").length,
    blank: sectionQuestions.filter((question) => statusOf(question) === "blank").length,
  };
  const filteredQuestions = sectionQuestions.filter((question) => {
    const status = statusOf(question);
    return activeFilter === "all" || status === activeFilter || (activeFilter === "issues" && status !== "correct");
  });
  const resultHref = (section: string, filter: string) => `/luyen-de/${examId}/ket-qua?attempt=${attempt.id}&section=${section}&filter=${filter}`;
  return (
    <main className="min-h-screen bg-slate-100 text-[#10243e]">
      <div className="mx-auto max-w-5xl px-5 py-10">
        <Link href={`/luyen-de/${examId}/lich-su`} className="font-black text-[#087eba]">← Lịch sử đề này</Link>
        <section className="mt-6 rounded-[2rem] bg-white p-8 shadow-2xl">
          <p className="text-xs font-black uppercase tracking-[.2em] text-emerald-600">Đã hoàn thành · {examAttemptModeLabel(attemptMode)}</p>
          <h1 className="mt-2 text-4xl font-black">Kết quả bài thi</h1>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {availableSections.includes("listening") && <Result value={`${attempt.listening_score ?? 0}/100`} label="Điểm Nghe" />}
            {availableSections.includes("reading") && <Result value={`${attempt.reading_score ?? 0}/100`} label="Điểm Đọc" />}
            <Result value={`${attempt.score ?? 0}/${maximumScore}`} label="Tổng điểm" />
            <Result value={`${attempt.correct_count ?? 0}/${attempt.total_questions}`} label="Câu đúng" />
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5"><p className="text-sm font-bold text-slate-500">Thời gian hoàn thành · Rời cửa sổ: <span className={attempt.window_leave_count > 0 ? "text-red-700" : "text-emerald-700"}>{attempt.window_leave_count ?? 0} lần</span></p><div className="flex gap-2"><Link href={`/luyen-de/${examId}`} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700">Làm lại</Link><Link href={`/luyen-de/${examId}/lich-su`} className="rounded-xl bg-[#087eba] px-4 py-2 text-sm font-black text-white">Xem lịch sử</Link></div></div>
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

        <section className="mt-8">
          <div className="rounded-3xl bg-white p-4 shadow-sm">
            <div className={`grid gap-2 ${availableSections.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>{availableSections.map((section) => <Link key={section} href={resultHref(section, activeFilter)} className={`rounded-2xl px-5 py-3 text-center font-black ${activeSection === section ? "bg-[#10243e] text-white" : "bg-slate-50 text-slate-600"}`}>{section === "listening" ? `Nghe · Câu 1–${questionCountFor("listening")}` : `Đọc · Câu ${readingOffset + 1}–${readingOffset + questionCountFor("reading")}`}</Link>)}</div>
            <div className="mt-3 flex flex-wrap gap-2">{[
              ["issues", "Cần chữa", counts.wrong + counts.blank], ["wrong", "Sai", counts.wrong], ["blank", "Bỏ trống", counts.blank], ["correct", "Đúng", counts.correct], ["all", "Tất cả", counts.all],
            ].map(([filter, label, count]) => <Link key={String(filter)} href={resultHref(activeSection, String(filter))} className={`rounded-full px-4 py-2 text-sm font-black ${activeFilter === filter ? "bg-[#087eba] text-white" : "bg-slate-100 text-slate-600"}`}>{label} · {count}</Link>)}</div>
          </div>
          <div className="mt-5 space-y-3">
              {filteredQuestions.map((question) => {
                const id = String(question.id);
                const correct = Number(question.correct_option);
                const selected = answers[id];
                const status = statusOf(question);
                const explanation = String(question.explanation ?? "");
                const instruction = String(question.instruction ?? "");
                const prompt = String(question.prompt ?? "");
                const passage = String(question.passage ?? "");
                const imageUrl = String(question.image_url ?? "");
                const audioUrl = String(question.audio_url ?? "");
                const options = Array.isArray(question.options) ? question.options.map(String) : [];
                const optionImages = Array.isArray(question.option_images) ? question.option_images.map(String) : [];
                const displayPosition = Number(question.position) + (activeSection === "reading" ? readingOffset : 0);
                return (
                  <details key={id} open={status !== "correct"} className={`group rounded-2xl border bg-white shadow-sm ${status === "correct" ? "border-emerald-200" : "border-red-200"}`}>
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5"><div><h3 className="font-black">Câu {displayPosition}</h3><p className="mt-1 text-sm font-semibold text-slate-500">Bạn chọn: {selected ? `${selected}. ${options[selected - 1] ?? ""}` : "Chưa trả lời"} · Đáp án: {correct}</p></div><div className="flex items-center gap-3"><span className={`rounded-full px-3 py-1 text-xs font-black ${status === "correct" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{status === "correct" ? "Đúng" : status === "wrong" ? "Sai" : "Bỏ trống"}</span><span className="text-slate-400 transition group-open:rotate-180">⌄</span></div></summary>
                    <div className="border-t border-slate-100 px-5 pb-6 pt-5">
                    {instruction && <p className="font-black text-slate-700">{instruction}</p>}{prompt && <p className="mt-2 text-lg font-semibold">{prompt}</p>}
                    {passage && <p className="mt-4 whitespace-pre-wrap rounded-2xl bg-slate-50 p-5 font-semibold leading-8">{passage}</p>}
                    {audioUrl && <ExamResultAudioPlayer src={audioUrl} questionNumber={displayPosition} />}
                    {imageUrl && <Image unoptimized src={imageUrl} alt={`Ngữ liệu câu ${displayPosition}`} width={640} height={480} className="mt-4 aspect-[4/3] w-full max-w-[420px] border border-slate-200 object-cover" />}
                    {question.answer_type === "image" && optionImages.length > 0 && (
                      <div className="mx-auto mt-4 grid max-w-[532px] grid-cols-2 gap-2.5">
                        {optionImages.map((url, optionIndex) => url && (
                          <div key={`${url}-${optionIndex}`} className={`relative aspect-[4/3] overflow-hidden border-2 ${optionIndex + 1 === correct ? "border-emerald-600 ring-2 ring-emerald-200" : optionIndex + 1 === selected ? "border-red-600 ring-2 ring-red-200" : "border-slate-200"}`}>
                            <Image unoptimized src={url} alt={`Đáp án ${optionIndex + 1}`} fill sizes="260px" className="object-cover" /><span className="absolute left-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-white text-sm font-black shadow">{optionIndex + 1}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="mt-2 font-semibold text-slate-600">Bạn chọn: {selected ? `${selected}. ${options[selected - 1] ?? ""}` : "Chưa trả lời"}</p>
                    <p className="mt-1 font-bold text-emerald-700">Đáp án: {correct}. {options[correct - 1] ?? ""}</p>
                    {explanation && <div className="mt-4 rounded-2xl bg-amber-50 p-4"><p className="text-xs font-black uppercase tracking-widest text-amber-700">Giải thích</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{explanation}</p></div>}
                    </div>
                  </details>
                );
              })}
              {!filteredQuestions.length && <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-white p-10 text-center font-bold text-slate-500">Không có câu nào trong bộ lọc này.</div>}
            </div>
          </section>
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
