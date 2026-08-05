"use client";

import { ChangeEvent, useActionState, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { readSheet } from "read-excel-file/browser";
import { saveExamDraft, submitExamForReview } from "./actions";
import { createClient } from "@/lib/supabase/client";
import { getExamEligibility, type ExamQuestionInput, type ExamSection } from "@/lib/exams/types";
import { parseCsv, parseExamImportRows } from "./exam-import";
import { hotfixPublishedExam } from "./exam-hotfix-actions";
import { normalizeExamQuestion, type StoredExamQuestion } from "./normalize-exam-question";
import { answerReviewPolicyOptions } from "@/lib/exams/answer-review-policy";
import type { ExamAnswerReviewPolicy, ExamLevel } from "@/lib/exams/types";

type ExamForEditor = {
  id: string; code: string; title: string; description: string; duration_minutes: number;
  listening_duration_minutes: number; reading_duration_minutes: number;
  level: ExamLevel; answer_review_policy: ExamAnswerReviewPolicy; answer_review_available_at: string | null;
  instructions: string; status: string; review_note: string | null; exam_questions: StoredExamQuestion[];
};

function toVietnamDateTimeLocal(value: string | null) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

function emptyQuestion(position: number, section: ExamSection): ExamQuestionInput {
  return { position, section, audioBlockKey: "", answerType: "text", instruction: section === "listening" ? "Nghe và chọn đáp án đúng." : "Đọc và chọn đáp án đúng.", prompt: "", audioUrl: "", audioText: "", imageUrl: "", playLimit: 1, options: ["", "", "", ""], optionImages: ["", "", "", ""], correctOption: 1, explanation: "" };
}

export function ExamEditor({ exam, error, hotfix = false, reviewEdit = false }: { exam: ExamForEditor; error?: string; hotfix?: boolean; reviewEdit?: boolean }) {
  const save = hotfix ? hotfixPublishedExam.bind(null, exam.id) : saveExamDraft.bind(null, exam.id);
  const [state, action, pending] = useActionState(save, { ok: false, message: "" });
  const [questions, setQuestions] = useState<ExamQuestionInput[]>(() => (exam.exam_questions ?? []).map(normalizeExamQuestion));
  const [activeSection, setActiveSection] = useState<ExamSection>("listening");
  const [answerReviewPolicy, setAnswerReviewPolicy] = useState<ExamAnswerReviewPolicy>(exam.answer_review_policy ?? "immediate");
  const [answerReviewAvailableAt, setAnswerReviewAvailableAt] = useState(() => toVietnamDateTimeLocal(exam.answer_review_available_at));
  const [busyIndex, setBusyIndex] = useState<number | null>(null);
  const [importMessage, setImportMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const editable = hotfix || reviewEdit || ["draft", "changes_requested"].includes(exam.status);
  const eligibility = getExamEligibility(questions);
  const ready = eligibility.eligible && questions.every((q) => q.options.every(Boolean));

  const serialized = useMemo(() => JSON.stringify(questions.map((q) => ({ ...q, position: questions.filter((item) => item.section === q.section).indexOf(q) + 1 }))), [questions]);
  const visibleQuestions = questions.filter((question) => question.section === activeSection);
  function patchQuestion(index: number, patch: Partial<ExamQuestionInput>) {
    setQuestions((current) => current.map((q, i) => i === index ? { ...q, ...patch } : q));
  }

  function patchAudioBlock(index: number, patch: Pick<ExamQuestionInput, "audioUrl" | "audioText">) {
    const blockKey = questions[index]?.audioBlockKey.trim();
    setQuestions((current) => current.map((question, questionIndex) =>
      questionIndex === index || (blockKey && question.audioBlockKey === blockKey)
        ? { ...question, ...patch }
        : question,
    ));
  }

  function addListeningGroup() {
    const blockKey = `audio-${crypto.randomUUID().slice(0, 8)}`;
    setQuestions((current) => {
      const start = current.filter((item) => item.section === "listening").length + 1;
      return [
        ...current,
        { ...emptyQuestion(start, "listening"), audioBlockKey: blockKey },
        { ...emptyQuestion(start + 1, "listening"), audioBlockKey: blockKey },
      ];
    });
  }

  async function createAudio(index: number) {
    const question = questions[index];
    if (!question.audioText.trim()) { setImportMessage(`Câu ${index + 1}: hãy nhập nội dung cần đọc.`); return; }
    setBusyIndex(index);
    setImportMessage(`Đang tạo audio cho câu ${index + 1}...`);
    try {
      const response = await fetch("/api/v1/tts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: question.audioText }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message ?? "Không thể tạo audio.");
      patchAudioBlock(index, { audioUrl: body.data.audioUrl, audioText: question.audioText });
      setImportMessage(`Câu ${index + 1}: audio Azure đã sẵn sàng${body.data.cached ? " (dùng cache)" : ""}.`);
    } catch (audioError) { setImportMessage(audioError instanceof Error ? audioError.message : "Không thể tạo audio."); }
    finally { setBusyIndex(null); }
  }

  async function uploadAudio(index: number, event: ChangeEvent<HTMLInputElement>) {
    const question = questions[index];
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    if (!new Set(["audio/mpeg", "audio/mp4", "audio/wav", "audio/x-wav"]).has(file.type)) { setImportMessage("Chỉ hỗ trợ MP3, M4A hoặc WAV."); return; }
    if (file.size > 15 * 1024 * 1024) { setImportMessage("Audio vượt quá 15 MB."); return; }
    setBusyIndex(index); setImportMessage(`Đang tải audio câu ${index + 1}...`);
    const supabase = createClient();
    const extension = file.name.split(".").pop()?.toLowerCase() || "mp3";
    const path = `${exam.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("exam-audio").upload(path, file, { contentType: file.type, cacheControl: "31536000" });
    if (uploadError) setImportMessage(`Tải audio thất bại: ${uploadError.message}`);
    else {
      const url = supabase.storage.from("exam-audio").getPublicUrl(path).data.publicUrl;
      patchAudioBlock(index, { audioUrl: url, audioText: question.audioText }); setImportMessage(`Câu ${index + 1}: đã tải audio lên CDN.`);
    }
    setBusyIndex(null);
  }

  async function uploadImage(index: number, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(file.type)) { setImportMessage("Chỉ hỗ trợ JPG, PNG hoặc WebP."); return; }
    if (file.size > 10 * 1024 * 1024) { setImportMessage("Ảnh vượt quá 10 MB."); return; }
    setBusyIndex(index); const supabase = createClient();
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${exam.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("exam-images").upload(path, file, { contentType: file.type, cacheControl: "31536000" });
    if (uploadError) setImportMessage(`Tải ảnh thất bại: ${uploadError.message}`);
    else { patchQuestion(index, { imageUrl: supabase.storage.from("exam-images").getPublicUrl(path).data.publicUrl }); setImportMessage("Đã tải ảnh câu hỏi lên CDN."); }
    setBusyIndex(null);
  }

  async function uploadOptionImage(index: number, optionIndex: number, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(file.type)) { setImportMessage("Chỉ hỗ trợ JPG, PNG hoặc WebP."); return; }
    if (file.size > 10 * 1024 * 1024) { setImportMessage("Ảnh vượt quá 10 MB."); return; }
    setBusyIndex(index);
    const supabase = createClient();
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${exam.id}/answers/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("exam-images").upload(path, file, { contentType: file.type, cacheControl: "31536000" });
    if (uploadError) setImportMessage(`Tải ảnh đáp án thất bại: ${uploadError.message}`);
    else {
      const optionImages = [...questions[index].optionImages];
      optionImages[optionIndex] = supabase.storage.from("exam-images").getPublicUrl(path).data.publicUrl;
      patchQuestion(index, { optionImages });
      setImportMessage(`Đã tải ảnh đáp án ${optionIndex + 1}.`);
    }
    setBusyIndex(null);
  }

  async function importExcel(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    try {
      const rows = file.name.toLowerCase().endsWith(".csv")
        ? parseCsv(await file.text())
        : await readSheet(file);
      const imported = parseExamImportRows(rows);
      setQuestions(imported);
      setImportMessage(`Đã đọc ${imported.length} câu. Hãy tạo hoặc tải audio cho từng câu rồi lưu đề.`);
    } catch (importError) { setImportMessage(importError instanceof Error ? importError.message : "Không thể đọc file Excel."); }
  }

  return <main className="mx-auto max-w-6xl px-5 py-10">
    <Link href={hotfix || reviewEdit ? `/quan-tri/de-thi/${exam.id}` : "/bien-tap/de-thi"} className="font-black text-[#087eba]">← {hotfix || reviewEdit ? "Quay lại duyệt đề" : "Ngân hàng đề"}</Link>
    <div className="mt-5 flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-widest text-cyan-700">TOPIK I · {hotfix ? "Hotfix bản phát hành" : exam.status}</p><h1 className="mt-2 text-4xl font-black">{exam.title}</h1></div>{editable && !hotfix && <form action={submitExamForReview}><input type="hidden" name="examId" value={exam.id} /><button disabled={!ready} className="rounded-2xl bg-emerald-600 px-5 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-40">Gửi admin duyệt →</button></form>}</div>
    {(error || exam.review_note) && <p role="alert" className="mt-5 rounded-2xl bg-amber-50 p-4 font-bold text-amber-800">{error ?? `Admin yêu cầu: ${exam.review_note}`}</p>}
    {reviewEdit && <p className="mt-5 rounded-2xl bg-violet-50 p-4 font-bold text-violet-800">Chỉnh sửa nhanh của admin: lưu xong đề vẫn ở hàng chờ duyệt để bạn kiểm tra và ra quyết định.</p>}
    {!editable && <p className="mt-5 rounded-2xl bg-sky-50 p-4 font-bold text-sky-800">Đề đang trong quy trình duyệt nên hiện chỉ được xem.</p>}
    <form action={action} className="mt-7 space-y-6">
      <input type="hidden" name="questions" value={serialized} />
      {hotfix && <label className="block rounded-3xl border border-amber-200 bg-amber-50 p-6 font-black">Lý do hotfix<textarea name="hotfixReason" required className="mt-2 min-h-24 w-full rounded-2xl border bg-white px-4 py-3" placeholder="Mô tả lỗi và nội dung cần áp dụng cho learner..." /></label>}
      <section className="grid gap-4 rounded-3xl bg-white p-6 shadow-sm md:grid-cols-2">
        <label className="font-black">Mã đề<input name="code" defaultValue={exam.code} disabled={!editable} className="mt-2 w-full rounded-2xl border px-4 py-3" /></label>
        <label className="font-black">Tên đề<input name="title" defaultValue={exam.title} disabled={!editable} className="mt-2 w-full rounded-2xl border px-4 py-3" /></label>
        <label className="font-black">Trình độ<select name="level" defaultValue={exam.level ?? "topik_i"} disabled={!editable} className="mt-2 w-full rounded-2xl border px-4 py-3"><option value="topik_i">TOPIK I</option><option value="topik_ii">TOPIK II</option></select></label>
        <label className="font-black">Chính sách xem đáp án<select name="answerReviewPolicy" value={answerReviewPolicy} disabled={!editable} onChange={(event) => setAnswerReviewPolicy(event.target.value as ExamAnswerReviewPolicy)} className="mt-2 w-full rounded-2xl border px-4 py-3">{answerReviewPolicyOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><span className="mt-2 block text-xs font-semibold leading-5 text-slate-500">{answerReviewPolicyOptions.find((option) => option.value === answerReviewPolicy)?.description}</span></label>
        {answerReviewPolicy === "after_date" && <label className="font-black md:col-span-2">Thời điểm công bố đáp án<input type="hidden" name="answerReviewAvailableAt" value={answerReviewAvailableAt ? new Date(`${answerReviewAvailableAt}:00+07:00`).toISOString() : ""} /><input type="datetime-local" required value={answerReviewAvailableAt} onChange={(event) => setAnswerReviewAvailableAt(event.target.value)} disabled={!editable} className="mt-2 w-full rounded-2xl border px-4 py-3" /><span className="mt-2 block text-xs font-semibold text-slate-500">Múi giờ Việt Nam (UTC+7)</span></label>}
        <label className="font-black">Thời gian Nghe<input name="listeningDurationMinutes" type="number" defaultValue={exam.listening_duration_minutes} disabled={!editable} className="mt-2 w-full rounded-2xl border px-4 py-3" /></label>
        <label className="font-black">Thời gian Đọc<input name="readingDurationMinutes" type="number" defaultValue={exam.reading_duration_minutes} disabled={!editable} className="mt-2 w-full rounded-2xl border px-4 py-3" /></label>
        <label className="font-black">Mô tả<input name="description" defaultValue={exam.description} disabled={!editable} className="mt-2 w-full rounded-2xl border px-4 py-3" /></label>
        <label className="font-black md:col-span-2">Hướng dẫn trước khi thi<textarea name="instructions" defaultValue={exam.instructions} disabled={!editable} className="mt-2 min-h-28 w-full rounded-2xl border px-4 py-3" /></label>
      </section>
      <section className="rounded-3xl bg-cyan-50 p-6">
        <div className="mb-5 flex gap-2"><button type="button" onClick={() => setActiveSection("listening")} className={`rounded-xl px-5 py-3 font-black ${activeSection === "listening" ? "bg-[#087eba] text-white" : "bg-white text-slate-600"}`}>Nghe · {questions.filter((q) => q.section === "listening").length}</button><button type="button" onClick={() => setActiveSection("reading")} className={`rounded-xl px-5 py-3 font-black ${activeSection === "reading" ? "bg-[#087eba] text-white" : "bg-white text-slate-600"}`}>Đọc · {questions.filter((q) => q.section === "reading").length}</button></div>
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-black">Câu {activeSection === "listening" ? "nghe" : "đọc"}</h2><p className="mt-1 text-sm font-semibold text-slate-600">{activeSection === "listening" ? "Một audio có thể dùng cho một câu hoặc cả nhóm câu liên tiếp." : "Có thể nhập tay, import bảng và thêm ảnh."}</p></div>{editable && <div className="flex flex-wrap gap-2"><input ref={fileRef} type="file" accept=".xlsx,.csv" onChange={(e) => void importExcel(e)} className="sr-only" /><button type="button" onClick={() => fileRef.current?.click()} className="rounded-xl border border-cyan-300 bg-white px-4 py-2 font-black text-cyan-800">Nhập Excel/CSV</button>{activeSection === "listening" && <button type="button" onClick={addListeningGroup} className="rounded-xl border border-violet-300 bg-violet-50 px-4 py-2 font-black text-violet-700">+ Nhóm 2 câu</button>}<button type="button" onClick={() => setQuestions((q) => [...q, emptyQuestion(q.filter((item) => item.section === activeSection).length + 1, activeSection)])} className="rounded-xl bg-[#087eba] px-4 py-2 font-black text-white">+ Thêm câu</button></div>}</div>
        {importMessage && <p aria-live="polite" className="mt-4 rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-700">{importMessage}</p>}
        <div className="mt-5 space-y-5">{visibleQuestions.map((q) => { const index = questions.indexOf(q); return <article key={`${q.id ?? "new"}-${index}`} className="rounded-3xl border border-cyan-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between"><h3 className="text-lg font-black">Câu {index + 1}</h3>{editable && <button type="button" onClick={() => setQuestions((items) => items.filter((_, i) => i !== index))} className="text-sm font-black text-red-600">Xóa</button>}</div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="font-bold">Loại đáp án<select value={q.answerType} disabled={!editable} onChange={(e) => patchQuestion(index, { answerType: e.target.value === "image" ? "image" : "text" })} className="mt-1 w-full rounded-xl border px-3 py-2.5"><option value="text">4 đáp án chữ</option><option value="image">4 đáp án ảnh</option></select></label>
            {q.section === "listening" && <label className="font-bold">Mã nhóm audio <span className="text-xs font-medium text-slate-500">(cùng mã = cùng audio)</span><input value={q.audioBlockKey} disabled={!editable} onChange={(e) => patchQuestion(index, { audioBlockKey: e.target.value })} className="mt-1 w-full rounded-xl border px-3 py-2.5" placeholder="Ví dụ: listen-25-26" /></label>}
            <label className="font-bold">Hướng dẫn<input value={q.instruction} disabled={!editable} onChange={(e) => patchQuestion(index, { instruction: e.target.value })} className="mt-1 w-full rounded-xl border px-3 py-2.5" /></label>
            <label className="font-bold">Câu hỏi hiển thị<input value={q.prompt} disabled={!editable} onChange={(e) => patchQuestion(index, { prompt: e.target.value })} className="mt-1 w-full rounded-xl border px-3 py-2.5" /></label>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">{q.options.map((option, optionIndex) => <div key={optionIndex} className="rounded-xl bg-slate-50 p-3"><label className="flex items-center gap-3"><input type="radio" checked={q.correctOption === optionIndex + 1} disabled={!editable} onChange={() => patchQuestion(index, { correctOption: optionIndex + 1 })} /><span className="font-black">{optionIndex + 1}</span><input value={option} disabled={!editable} onChange={(e) => { const options = [...q.options]; options[optionIndex] = e.target.value; patchQuestion(index, { options }); }} className="min-w-0 flex-1 bg-transparent outline-none" placeholder={q.answerType === "image" ? `Nhãn ảnh ${optionIndex + 1}` : `Đáp án ${optionIndex + 1}`} /></label>{q.answerType === "image" && <div className="mt-3 flex items-center gap-2">{q.optionImages[optionIndex] && <Image unoptimized src={q.optionImages[optionIndex]} alt={`Đáp án ảnh ${optionIndex + 1}`} width={112} height={80} className="h-20 w-28 rounded-lg object-cover" />}{editable && <label className="cursor-pointer rounded-lg border bg-white px-3 py-2 text-xs font-black text-cyan-700">{q.optionImages[optionIndex] ? "Thay ảnh" : "Tải ảnh"}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void uploadOptionImage(index, optionIndex, event)} className="sr-only" /></label>}{editable && q.optionImages[optionIndex] && <button type="button" onClick={() => { const optionImages = [...q.optionImages]; optionImages[optionIndex] = ""; patchQuestion(index, { optionImages }); }} className="text-xs font-black text-red-600">Bỏ ảnh</button>}</div>}</div>)}</div>
          <label className="mt-4 block font-bold">Giải thích sau khi nộp<textarea value={q.explanation} disabled={!editable} onChange={(e) => patchQuestion(index, { explanation: e.target.value })} className="mt-1 min-h-20 w-full rounded-xl border px-3 py-2.5" /></label>
          {q.section === "listening" && <div className="mt-4 rounded-2xl bg-violet-50 p-4"><label className="font-bold">Nội dung Azure đọc <span className="text-xs text-slate-500">(không bắt buộc)</span><textarea value={q.audioText} disabled={!editable} onChange={(e) => patchQuestion(index, { audioText: e.target.value })} className="mt-1 min-h-20 w-full rounded-xl border bg-white px-3 py-2.5" /></label><div className="mt-3 flex flex-wrap items-center gap-2">{editable && <><button type="button" disabled={busyIndex !== null} onClick={() => void createAudio(index)} className="rounded-xl bg-violet-600 px-4 py-2 font-black text-white disabled:opacity-50">{busyIndex === index ? "Đang xử lý..." : "Tạo audio Azure"}</button><label className="cursor-pointer rounded-xl border border-violet-200 bg-white px-4 py-2 font-black text-violet-700">Tải audio<input type="file" accept="audio/mpeg,audio/mp4,audio/wav" onChange={(e) => void uploadAudio(index, e)} className="sr-only" /></label></>}{q.audioUrl ? <audio controls preload="none" src={q.audioUrl} className="h-10 max-w-full" /> : <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">Không có audio · vẫn được gửi duyệt</span>}</div></div>}
          <div className="mt-4 rounded-2xl bg-amber-50 p-4"><div className="flex flex-wrap items-center gap-2">{editable && <label className="cursor-pointer rounded-xl border border-amber-200 bg-white px-4 py-2 font-black text-amber-800">Tải ảnh câu hỏi<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => void uploadImage(index, e)} className="sr-only" /></label>}{q.imageUrl && <a href={q.imageUrl} target="_blank" rel="noreferrer" className="font-bold text-amber-800 underline">Xem ảnh đã tải</a>}</div></div>
        </article>; })}</div>
        {!visibleQuestions.length && <p className="mt-5 rounded-2xl border-2 border-dashed border-cyan-200 bg-white p-8 text-center font-bold text-slate-500">Chưa có câu {activeSection === "listening" ? "nghe" : "đọc"}. Thêm thủ công hoặc nhập Excel/CSV.</p>}
      </section>
      {editable && <div className="sticky bottom-4 rounded-2xl border bg-white/95 p-4 shadow-xl backdrop-blur"><div className="flex items-center justify-between gap-4"><p aria-live="polite" className={`font-bold ${state.ok ? "text-emerald-700" : "text-red-700"}`}>{state.message || `${questions.length} câu · ${ready ? "đủ điều kiện gửi duyệt" : eligibility.issues[0] ?? "còn thiếu đáp án"}`}</p><button disabled={pending} className="rounded-xl bg-[#10243e] px-5 py-3 font-black text-white disabled:opacity-50">{pending ? "Đang lưu..." : hotfix ? "Áp dụng hotfix" : reviewEdit ? "Lưu chỉnh sửa nhanh" : "Lưu bản nháp"}</button></div></div>}
    </form>
  </main>;
}
