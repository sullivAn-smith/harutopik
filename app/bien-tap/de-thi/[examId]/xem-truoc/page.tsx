import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { markExamPreviewed } from "@/features/exams/actions";
import { normalizeExamQuestion } from "@/features/exams/normalize-exam-question";
import { getExamForEditing } from "@/lib/data/exams";

export default async function ExamPreviewPage({ params, searchParams }: { params: Promise<{ examId: string }>; searchParams: Promise<{ error?: string; section?: string }> }) {
  const [{ examId }, notice] = await Promise.all([params, searchParams]);
  const exam = await getExamForEditing(examId);
  if (!exam) notFound();
  const questions = (exam.exam_questions ?? []).map(normalizeExamQuestion);
  const activeSection = notice.section === "reading" ? "reading" : "listening";
  const visibleQuestions = questions.filter((question) => question.section === activeSection).sort((a, b) => a.position - b.position);
  const readingOffset = exam.level === "topik_ii" ? 50 : 30;
  return <main className="mx-auto max-w-5xl px-5 py-10">
    <div className="flex flex-wrap items-center justify-between gap-4"><Link href={`/bien-tap/de-thi/${exam.id}`} className="font-black text-[#087eba]">← Quay lại wizard</Link><span className="rounded-full bg-amber-100 px-4 py-2 text-xs font-black uppercase tracking-widest text-amber-800">Preview · không ghi kết quả</span></div>
    <section className="mt-6 rounded-3xl bg-[#10243e] p-7 text-white"><p className="text-sm font-black text-cyan-200">{exam.level === "topik_ii" ? "TOPIK II" : "TOPIK I"}</p><h1 className="mt-2 text-3xl font-black">{exam.title}</h1><p className="mt-3 text-slate-200">{exam.instructions}</p></section>
    {notice.error && <p className="mt-5 rounded-2xl bg-red-50 p-4 font-bold text-red-700">{notice.error}</p>}
    <nav aria-label="Chọn phần xem trước" className="mt-7 grid grid-cols-2 gap-2 rounded-2xl border bg-white p-2 shadow-sm">
      <Link href={`/bien-tap/de-thi/${exam.id}/xem-truoc?section=listening`} className={`rounded-xl px-5 py-3 text-center font-black ${activeSection === "listening" ? "bg-[#087eba] text-white" : "text-slate-600 hover:bg-slate-50"}`}>Nghe · Câu 1–{readingOffset}</Link>
      <Link href={`/bien-tap/de-thi/${exam.id}/xem-truoc?section=reading`} className={`rounded-xl px-5 py-3 text-center font-black ${activeSection === "reading" ? "bg-[#087eba] text-white" : "text-slate-600 hover:bg-slate-50"}`}>Đọc · Câu {readingOffset + 1}–{exam.level === "topik_ii" ? 100 : 70}</Link>
    </nav>
    <div className="mt-6 space-y-6">{visibleQuestions.map((question, index) => {
      const firstOfShared = !question.passageBlockKey || visibleQuestions.findIndex((item) => item.passageBlockKey === question.passageBlockKey) === index;
      const displayPosition = question.section === "reading" ? readingOffset + question.position : question.position;
      const showSideImage = Boolean(question.imageUrl && question.answerType !== "image" && firstOfShared);
      return <article key={question.id ?? `${question.section}-${question.position}`} className="rounded-3xl border bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-widest text-cyan-700">{question.section === "listening" ? "Nghe" : "Đọc"} · Câu {displayPosition}</p>
        {question.section === "listening" && question.audioUrl && <audio controls preload="metadata" src={question.audioUrl} className="mt-4 w-full" />}
        {question.section === "reading" && firstOfShared && question.passage && <p className="mt-4 whitespace-pre-wrap rounded-2xl bg-slate-50 p-5 text-lg font-semibold leading-8">{question.passage}</p>}
        <div className={`mt-4 ${showSideImage ? "grid items-start gap-6 lg:grid-cols-[minmax(240px,0.8fr)_minmax(360px,1.2fr)]" : ""}`}>
          {showSideImage && <Image unoptimized src={question.imageUrl} alt={`Ngữ liệu câu ${displayPosition}`} width={640} height={480} className="aspect-[4/3] w-full max-w-[420px] justify-self-center border border-slate-200 object-cover" />}
          <div><p className="text-sm font-bold text-slate-500">{question.instruction}</p><h2 className="mt-2 text-xl font-black">{question.prompt}</h2>
        {question.answerType === "image"
          ? <div className="mx-auto mt-5 grid max-w-[532px] grid-cols-2 gap-2.5">{question.optionImages.map((imageUrl, optionIndex) => <label key={optionIndex} className="group relative block cursor-pointer"><input type="radio" name={`preview-${index}`} className="peer sr-only" /><span className="relative block aspect-[4/3] overflow-hidden border border-slate-200 bg-slate-50 transition hover:border-cyan-600 peer-checked:border-[3px] peer-checked:border-[#10243e] peer-checked:ring-2 peer-checked:ring-sky-300">{imageUrl && <Image unoptimized src={imageUrl} alt={`Đáp án ${optionIndex + 1}`} fill sizes="(max-width: 640px) 45vw, 260px" className="object-cover" />}<span className="absolute left-2 top-2 grid h-7 w-7 place-items-center rounded-full border border-slate-300 bg-white/95 text-sm font-black text-slate-800 shadow-sm">{optionIndex + 1}</span></span></label>)}</div>
          : <div className={`mt-5 grid gap-3 ${showSideImage ? "grid-cols-1" : "sm:grid-cols-2"}`}>{question.options.map((option, optionIndex) => <label key={optionIndex} className="flex cursor-pointer items-center gap-3 rounded-2xl border p-4 font-bold hover:border-cyan-400"><input type="radio" name={`preview-${index}`} /><span>{optionIndex + 1}. {option}</span></label>)}</div>}
          </div>
        </div>
      </article>;
    })}</div>
    {!visibleQuestions.length && <p className="mt-7 rounded-3xl border-2 border-dashed p-10 text-center font-bold text-slate-500">Phần {activeSection === "listening" ? "Nghe" : "Đọc"} chưa có câu hỏi để xem trước.</p>}
    <form action={markExamPreviewed} className="sticky bottom-4 mt-8 rounded-3xl border bg-white/95 p-5 shadow-xl backdrop-blur"><input type="hidden" name="examId" value={exam.id} /><div className="flex flex-wrap items-center justify-between gap-4"><p className="font-bold text-slate-600">Đã kiểm tra bố cục, audio, ngữ liệu và đủ 4 đáp án?</p><button disabled={!questions.length} className="rounded-2xl bg-emerald-600 px-6 py-3 font-black text-white disabled:opacity-40">Xác nhận đã xem trước →</button></div></form>
  </main>;
}
