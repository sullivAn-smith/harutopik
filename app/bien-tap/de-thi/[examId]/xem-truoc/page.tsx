import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { markExamPreviewed } from "@/features/exams/actions";
import { normalizeExamQuestion } from "@/features/exams/normalize-exam-question";
import { getExamForEditing } from "@/lib/data/exams";
import { boxesTopikIIReadingPrimaryPrompt, boxesTopikIIReadingSecondaryPrompt, getTopikIITextAnswerLayout, showsTopikIIReadingImageAbove, showsTopikIIReadingTitleAbove, usesCompactTopikIIReadingImageFrame } from "@/lib/exams/exam-question-layout";

function UnderlinedPrompt({ text, underlinedText }: { text: string; underlinedText?: string }) {
  const target = underlinedText?.trim() ?? "";
  const start = target ? text.indexOf(target) : -1;
  if (start < 0) return <>{text}</>;
  const end = start + target.length;
  return <>{text.slice(0, start)}<u className="decoration-2 underline-offset-4">{text.slice(start, end)}</u>{text.slice(end)}</>;
}

export default async function ExamPreviewPage({ params, searchParams }: { params: Promise<{ examId: string }>; searchParams: Promise<{ error?: string; section?: string }> }) {
  const [{ examId }, notice] = await Promise.all([params, searchParams]);
  const exam = await getExamForEditing(examId);
  if (!exam) notFound();
  const questions = (exam.exam_questions ?? []).map(normalizeExamQuestion);
  const activeSection = notice.section === "reading" ? "reading" : "listening";
  const visibleQuestions = questions.filter((question) => question.section === activeSection).sort((a, b) => a.position - b.position);
  const readingOffset = exam.level === "topik_i" ? 30 : 0;
  const listeningEnd = exam.level === "topik_i" ? 30 : 50;
  const readingEnd = exam.level === "topik_i" ? 70 : 50;
  const shouldShareLearnerFrame = (first?: typeof visibleQuestions[number], second?: typeof visibleQuestions[number]) => Boolean(
    first
    && second
    && second.position === first.position + 1
    && (
      (exam.level === "topik_i"
        && activeSection === "listening"
        && first.position >= 25
        && first.position <= 29
        && first.position % 2 === 1
        && first.audioBlockKey
        && first.audioBlockKey === second.audioBlockKey)
      || (exam.level === "topik_ii"
        && activeSection === "listening"
        && first.position >= 21
        && first.position <= 49
        && first.position % 2 === 1
        && first.audioBlockKey
        && first.audioBlockKey === second.audioBlockKey)
      || (exam.level === "topik_i"
        && activeSection === "reading"
        && ((first.position >= 19 && first.position <= 25)
          || (first.position >= 29 && first.position <= 31)
          || (first.position >= 33 && first.position <= 39))
        && first.position % 2 === 1
        && first.passageBlockKey
        && first.passageBlockKey === second.passageBlockKey)
    ),
  );
  const previewQuestionBlocks: Array<typeof visibleQuestions> = [];
  for (let index = 0; index < visibleQuestions.length; index += 1) {
    const question = visibleQuestions[index];
    const nextQuestion = visibleQuestions[index + 1];
    const keepsSeparateTopikIReading57To58 = exam.level === "topik_i" && question.position >= 27 && question.position <= 28;
    if (activeSection === "reading" && question.passageBlockKey && !keepsSeparateTopikIReading57To58) {
      const sharedQuestions = visibleQuestions.slice(index).filter((candidate, candidateIndex, remaining) =>
        candidate.passageBlockKey === question.passageBlockKey
        && candidate.position === question.position + candidateIndex
        && (candidateIndex === 0 || remaining[candidateIndex - 1]?.passageBlockKey === question.passageBlockKey),
      );
      if (sharedQuestions.length > 1) {
        previewQuestionBlocks.push(sharedQuestions);
        index += sharedQuestions.length - 1;
        continue;
      }
    }
    if (shouldShareLearnerFrame(question, nextQuestion)) {
      previewQuestionBlocks.push([question, nextQuestion]);
      index += 1;
    } else {
      previewQuestionBlocks.push([question]);
    }
  }
  return <main className="mx-auto max-w-5xl px-5 py-10">
    <div className="flex flex-wrap items-center justify-between gap-4"><Link href={`/bien-tap/de-thi/${exam.id}`} className="font-black text-[#087eba]">← Quay lại wizard</Link><span className="rounded-full bg-amber-100 px-4 py-2 text-xs font-black uppercase tracking-widest text-amber-800">Preview · không ghi kết quả</span></div>
    <section className="mt-6 rounded-3xl bg-[#10243e] p-7 text-white"><p className="text-sm font-black text-cyan-200">{exam.level === "topik_ii" ? "TOPIK II" : "TOPIK I"}</p><h1 className="mt-2 text-3xl font-black">{exam.title}</h1><p className="mt-3 text-slate-200">{exam.instructions}</p></section>
    {notice.error && <p className="mt-5 rounded-2xl bg-red-50 p-4 font-bold text-red-700">{notice.error}</p>}
    <nav aria-label="Chọn phần xem trước" className="mt-7 grid grid-cols-2 gap-2 rounded-2xl border bg-white p-2 shadow-sm">
      <Link href={`/bien-tap/de-thi/${exam.id}/xem-truoc?section=listening`} className={`rounded-xl px-5 py-3 text-center font-black ${activeSection === "listening" ? "bg-[#087eba] text-white" : "text-slate-600 hover:bg-slate-50"}`}>Nghe · Câu 1–{listeningEnd}</Link>
      <Link href={`/bien-tap/de-thi/${exam.id}/xem-truoc?section=reading`} className={`rounded-xl px-5 py-3 text-center font-black ${activeSection === "reading" ? "bg-[#087eba] text-white" : "text-slate-600 hover:bg-slate-50"}`}>Đọc · Câu {readingOffset + 1}–{readingEnd}</Link>
    </nav>
    <div className="mt-6 space-y-6">{previewQuestionBlocks.map((questionBlock) => {
      const sharedLearnerFrame = questionBlock.length > 1;
      const renderedQuestions = questionBlock.map((question) => {
      const index = visibleQuestions.indexOf(question);
      const separatesTopikIReading57To58 = exam.level === "topik_i" && question.section === "reading" && question.position >= 27 && question.position <= 28;
      const firstOfShared = separatesTopikIReading57To58 || !question.passageBlockKey || visibleQuestions.findIndex((item) => item.passageBlockKey === question.passageBlockKey) === index;
      const displayPosition = question.section === "reading" ? readingOffset + question.position : question.position;
      const sharedQuestions = question.passageBlockKey && !separatesTopikIReading57To58 ? visibleQuestions.filter((item) => item.passageBlockKey === question.passageBlockKey) : [];
      const sharedRange = sharedQuestions.length > 1 ? `${readingOffset + sharedQuestions[0].position}~${readingOffset + sharedQuestions[sharedQuestions.length - 1].position}` : "";
      const sharedAudioRange = sharedLearnerFrame && question.section === "listening"
        ? `${questionBlock[0].position}~${questionBlock[questionBlock.length - 1].position}`
        : "";
      const firstOfSharedAudio = Boolean(sharedAudioRange) && question === questionBlock[0];
      const isTopikIBoxedReading = exam.level === "topik_i" && question.section === "reading" && ((question.position >= 1 && question.position <= 9) || (question.position >= 13 && question.position <= 18));
      const isTopikIHorizontalBoxedReading = exam.level === "topik_i" && question.section === "reading" && question.position >= 1 && question.position <= 9;
      const isTopikIReading40To42 = exam.level === "topik_i" && question.section === "reading" && question.position >= 10 && question.position <= 12;
      const isTopikIReading57To58 = exam.level === "topik_i" && question.section === "reading" && question.position >= 27 && question.position <= 28;
      const showsTitleAboveImage = isTopikIReading40To42 || isTopikIReading57To58;
      const isTopikILargeImageReading = exam.level === "topik_i" && question.section === "reading" && ((question.position >= 10 && question.position <= 12) || (question.position >= 33 && question.position <= 34));
      const isTopikIReadingQuestion59 = exam.level === "topik_i" && question.section === "reading" && question.position === 29;
      const isTopikIVerticalSharedReadingAnswer = exam.level === "topik_i" && question.section === "reading" && [20, 24, 26, 32, 33, 34, 35, 36, 40].includes(question.position);
      const isTopikIVerticalListeningAnswer = exam.level === "topik_i" && question.section === "listening" && question.position >= 17 && question.position <= 30;
      const hidesTopikIReadingPassage = exam.level === "topik_i" && question.section === "reading" && question.position >= 1 && question.position <= 18;
      const showSideImage = Boolean(question.imageUrl && question.answerType !== "image" && firstOfShared);
      const topikIIAnswerLayout = getTopikIITextAnswerLayout(exam.level, question.section, question.position);
      const preservesTopikIIReadingImage = exam.level === "topik_ii" && question.section === "reading";
      const isTopikIIReadingImageAbove = showsTopikIIReadingImageAbove(exam.level, question.section, question.position);
      const usesCompactTopikIIImageFrame = usesCompactTopikIIReadingImageFrame(exam.level, question.section, question.position);
      const isTopikIIReadingTitleAbove = showsTopikIIReadingTitleAbove(exam.level, question.section, question.position);
      const boxesTopikIIPrimaryPrompt = boxesTopikIIReadingPrimaryPrompt(exam.level, question.section, question.position);
      const boxesTopikIISecondaryPrompt = boxesTopikIIReadingSecondaryPrompt(exam.level, question.section, question.position);
      const showListeningAudio = question.section === "listening" && question.audioUrl && (!sharedLearnerFrame || question === questionBlock[0]);
      return <article key={question.id ?? `${question.section}-${question.position}`} className={sharedLearnerFrame ? "p-6" : "rounded-3xl border bg-white p-6 shadow-sm"}>
        <p className="text-xs font-black uppercase tracking-widest text-cyan-700">{question.section === "listening" ? "Nghe" : "Đọc"} · Câu {displayPosition}</p>
        {showListeningAudio && <audio controls preload="metadata" src={question.audioUrl} className="mt-4 w-full" />}
        {firstOfSharedAudio && question.instruction && <p className="mt-4 text-lg font-bold text-slate-900">[{sharedAudioRange}] {question.instruction}</p>}
        {question.section === "reading" && firstOfShared && sharedRange && question.instruction && <p className="mt-4 text-lg font-bold text-slate-900">[{sharedRange}] {question.instruction}</p>}
        {showsTitleAboveImage && !sharedRange && question.instruction && <p className="mt-4 text-lg font-bold text-slate-900">{question.instruction}</p>}
        {isTopikIIReadingTitleAbove && !sharedRange && question.instruction && <p className="mt-4 text-lg font-bold text-slate-900">{question.instruction}</p>}
        {question.section === "reading" && firstOfShared && question.passage && !hidesTopikIReadingPassage && <p className="exam-material-frame mt-4 whitespace-pre-wrap border-[3px] border-black bg-white p-5 text-lg font-normal leading-8"><UnderlinedPrompt text={question.passage} underlinedText={exam.level === "topik_ii" ? question.underlinedText : ""} /></p>}
        <div className={`mt-4 ${showSideImage && !isTopikILargeImageReading && !isTopikIIReadingImageAbove ? "grid items-start gap-6 lg:grid-cols-[minmax(240px,0.8fr)_minmax(360px,1.2fr)]" : ""}`}>
          {showSideImage && (usesCompactTopikIIImageFrame
            ? <span className="exam-material-frame relative mx-auto block h-40 w-full max-w-[820px] overflow-hidden rounded-xl border-[3px] border-black bg-white sm:h-44"><Image unoptimized src={question.imageUrl} alt={`Ngữ liệu câu ${displayPosition}`} width={1200} height={900} className="absolute inset-0 h-full w-full object-cover object-center" /></span>
            : <Image unoptimized src={question.imageUrl} alt={`Ngữ liệu câu ${displayPosition}`} width={1200} height={900} className={isTopikILargeImageReading || isTopikIIReadingImageAbove || preservesTopikIIReadingImage ? "exam-material-frame mx-auto h-auto max-h-[760px] w-full max-w-[920px] rounded-xl border-[3px] border-black bg-white object-contain p-3" : "exam-material-frame aspect-[4/3] w-full max-w-[420px] justify-self-center border-[3px] border-black object-cover"} />)}
          <div>{!sharedRange && !sharedAudioRange && !showsTitleAboveImage && !isTopikIIReadingTitleAbove && <p className="text-lg font-bold text-slate-900">{question.instruction}</p>}<h2 className={isTopikIBoxedReading || boxesTopikIIPrimaryPrompt ? "exam-material-frame mt-3 border-[3px] border-black bg-white px-5 py-4 text-lg font-normal leading-8 text-slate-800" : "mt-2 text-lg font-normal leading-8 text-slate-800"}><UnderlinedPrompt text={question.prompt} underlinedText={exam.level === "topik_ii" ? question.underlinedText : ""} /></h2>{question.section === "reading" && question.audioText && !(exam.level === "topik_ii" && [3, 4, 42, 48].includes(question.position)) && <div className={isTopikIReadingQuestion59 ? "mt-4 border border-slate-500 bg-white p-4" : boxesTopikIISecondaryPrompt ? "exam-material-frame mt-4 border-[3px] border-black bg-white p-4" : "mt-4 rounded-2xl border bg-slate-50 p-4"}>{!isTopikIReadingQuestion59 && <p className="text-center text-xs font-black text-slate-500">＜보기＞</p>}<p className={`${isTopikIReadingQuestion59 ? "" : "mt-2 "}whitespace-pre-wrap text-lg font-normal leading-8 text-slate-800`}>{question.audioText}</p></div>}
        {question.answerType === "image"
          ? <div className="mx-auto mt-5 grid max-w-[532px] grid-cols-2 gap-2.5">{question.optionImages.map((imageUrl, optionIndex) => <label key={optionIndex} className="group relative block cursor-pointer"><input type="radio" name={`preview-${index}`} className="peer sr-only" /><span className="relative block aspect-[4/3] overflow-hidden border border-slate-200 bg-slate-50 transition hover:border-cyan-600 peer-checked:border-[3px] peer-checked:border-[#10243e] peer-checked:ring-2 peer-checked:ring-sky-300">{imageUrl && <Image unoptimized src={imageUrl} alt={`Đáp án ${optionIndex + 1}`} fill sizes="(max-width: 640px) 45vw, 260px" className={preservesTopikIIReadingImage ? "bg-white object-contain p-1" : "object-cover"} />}<span className="absolute left-2 top-2 grid h-7 w-7 place-items-center rounded-full border border-slate-300 bg-white/95 text-sm font-black text-slate-800 shadow-sm">{optionIndex + 1}</span></span></label>)}</div>
          : <div className={`mt-5 grid gap-3 ${topikIIAnswerLayout === "vertical" ? "grid-cols-1" : topikIIAnswerLayout === "two_columns" ? "grid-cols-1 gap-x-8 sm:grid-cols-2" : topikIIAnswerLayout === "horizontal" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" : isTopikILargeImageReading ? "mx-auto w-full max-w-[920px] grid-cols-1" : showSideImage ? "grid-cols-1" : isTopikIVerticalListeningAnswer || isTopikIVerticalSharedReadingAnswer ? "grid-cols-1" : isTopikIReadingQuestion59 || isTopikIHorizontalBoxedReading ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" : isTopikIBoxedReading ? "grid-cols-1" : "sm:grid-cols-2"}`}>{question.options.map((option, optionIndex) => <label key={optionIndex} className="flex cursor-pointer items-center gap-3 rounded-2xl border p-4 text-lg font-normal hover:border-cyan-400"><input type="radio" name={`preview-${index}`} /><span>{optionIndex + 1}. {option}</span></label>)}</div>}
          </div>
        </div>
      </article>;
      });
      if (!sharedLearnerFrame) return renderedQuestions[0];
      const blockOffset = questionBlock[0].section === "reading" ? readingOffset : 0;
      const range = `${questionBlock[0].position + blockOffset}-${questionBlock[questionBlock.length - 1].position + blockOffset}`;
      const isReadingPairFrame = questionBlock[0].section === "reading";
      return <div
        key={`preview-shared-frame-${range}`}
        role="group"
        aria-label={`Khung câu ${range}`}
        data-testid={`preview-shared-frame-${range}`}
        className={isReadingPairFrame ? "divide-y divide-slate-200 overflow-hidden rounded-3xl bg-white shadow-sm" : "divide-y divide-cyan-100 overflow-hidden rounded-3xl border-2 border-cyan-200 bg-white shadow-sm"}
      >
        {renderedQuestions}
      </div>;
    })}</div>
    {!visibleQuestions.length && <p className="mt-7 rounded-3xl border-2 border-dashed p-10 text-center font-bold text-slate-500">Phần {activeSection === "listening" ? "Nghe" : "Đọc"} chưa có câu hỏi để xem trước.</p>}
    <form action={markExamPreviewed} className="sticky bottom-4 mt-8 rounded-3xl border bg-white/95 p-5 shadow-xl backdrop-blur"><input type="hidden" name="examId" value={exam.id} /><div className="flex flex-wrap items-center justify-between gap-4"><p className="font-bold text-slate-600">Đã kiểm tra bố cục, audio, ngữ liệu và đủ 4 đáp án?</p><button disabled={!questions.length} className="rounded-2xl bg-emerald-600 px-6 py-3 font-black text-white disabled:opacity-40">Xác nhận đã xem trước →</button></div></form>
  </main>;
}
