"use client";

import { ChangeEvent, useActionState, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { readSheet } from "read-excel-file/browser";
import { saveExamDraft, submitExamForReview } from "./actions";
import { createClient } from "@/lib/supabase/client";
import { getExamEligibility, type ExamQuestionInput, type ExamSection } from "@/lib/exams/types";
import { parseCsv, parseExamImportRows } from "./exam-import";
import { hotfixPublishedExam } from "./exam-hotfix-actions";
import { normalizeExamQuestion, type StoredExamQuestion } from "./normalize-exam-question";
import type { ExamAnswerReviewPolicy, ExamLevel, ExamReadingType } from "@/lib/exams/types";
import { ExamImageUpload } from "./exam-image-upload";

type ExamForEditor = {
  id: string; code: string; title: string; description: string; duration_minutes: number;
  listening_duration_minutes: number; reading_duration_minutes: number;
  level: ExamLevel; answer_review_policy: ExamAnswerReviewPolicy; answer_review_available_at: string | null;
  instructions: string; status: string; review_note: string | null; exam_questions: StoredExamQuestion[];
};

function emptyQuestion(position: number, section: ExamSection): ExamQuestionInput {
  return { position, section, audioBlockKey: "", readingType: "standard", passageBlockKey: "", passage: "", answerType: "text", instruction: section === "listening" ? "Nghe và chọn đáp án đúng." : "Đọc và chọn đáp án đúng.", prompt: "", audioUrl: "", audioText: "", imageUrl: "", playLimit: 1, options: ["", "", "", ""], optionImages: ["", "", "", ""], correctOption: 1, explanation: "" };
}

const readingTypeOptions: Array<{ value: ExamReadingType; label: string }> = [
  { value: "standard", label: "Câu đọc thông thường" },
  { value: "fill_blank", label: "Điền từ / ngữ pháp" },
  { value: "image_match", label: "Chọn tranh / biểu tượng" },
  { value: "practical_info", label: "Quảng cáo / thông báo / biểu đồ" },
  { value: "same_topic", label: "Cùng chủ đề / mục đích" },
  { value: "main_idea", label: "Ý chính / mục đích" },
  { value: "sentence_order", label: "Sắp xếp câu" },
  { value: "insert_sentence", label: "Điền câu vào đoạn văn" },
  { value: "equivalent_expression", label: "Cùng nghĩa / lỗi diễn đạt" },
  { value: "title_match", label: "Chọn tiêu đề" },
  { value: "long_passage", label: "Đoạn dài · nhóm câu" },
];

export function ExamEditor({ exam, error, hotfix = false, reviewEdit = false }: { exam: ExamForEditor; error?: string; hotfix?: boolean; reviewEdit?: boolean }) {
  const save = hotfix ? hotfixPublishedExam.bind(null, exam.id) : saveExamDraft.bind(null, exam.id);
  const [state, action, pending] = useActionState(save, { ok: false, message: "" });
  const [questions, setQuestions] = useState<ExamQuestionInput[]>(() => (exam.exam_questions ?? []).map(normalizeExamQuestion));
  const [activeSection, setActiveSection] = useState<ExamSection>("listening");
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

  function addReadingGroup() {
    const blockKey = `passage-${crypto.randomUUID().slice(0, 8)}`;
    setQuestions((current) => {
      const start = current.filter((item) => item.section === "reading").length + 1;
      return [...current,
        { ...emptyQuestion(start, "reading"), readingType: "long_passage", passageBlockKey: blockKey },
        { ...emptyQuestion(start + 1, "reading"), readingType: "long_passage", passageBlockKey: blockKey },
      ];
    });
  }

  function patchPassageBlock(index: number, patch: Pick<ExamQuestionInput, "passage" | "imageUrl" | "readingType">) {
    const blockKey = questions[index]?.passageBlockKey.trim();
    setQuestions((current) => current.map((question, questionIndex) =>
      questionIndex === index || (blockKey && question.passageBlockKey === blockKey)
        ? { ...question, ...patch }
        : question,
    ));
  }

  function removeQuestion(index: number) {
    setQuestions((current) => {
      const removed = current[index];
      if (!removed) return current;

      const next = current.filter((_, questionIndex) => questionIndex !== index);
      const groupKey = removed.audioBlockKey || removed.passageBlockKey;
      if (!groupKey) return next;

      const remainingGroup = next.filter((question) => question.audioBlockKey === groupKey || question.passageBlockKey === groupKey);
      if (remainingGroup.length !== 1) return next;

      return next.map((question) => question === remainingGroup[0]
        ? { ...question, audioBlockKey: "", passageBlockKey: "" }
        : question);
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

  async function importExcel(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    try {
      const rows = file.name.toLowerCase().endsWith(".csv")
        ? parseCsv(await file.text())
        : await readSheet(file);
      const imported = parseExamImportRows(rows);
      const importedSections = new Set(imported.map((question) => question.section));
      setQuestions((current) => [...current.filter((question) => !importedSections.has(question.section)), ...imported]);
      setImportMessage(`Đã nhập ${imported.length} câu và giữ nguyên phần không có trong file.`);
    } catch (importError) { setImportMessage(importError instanceof Error ? importError.message : "Không thể đọc file Excel."); }
  }

  function downloadImportTemplate() {
    const headers = [
      "section", "number", "reading_type", "passage_group", "passage", "instruction", "question",
      "answer_type", "option_1", "option_2", "option_3", "option_4", "correct_option", "explanation",
      "audio_block", "audio_text", "image_url", "option_image_1", "option_image_2", "option_image_3", "option_image_4",
    ];
    const rows = [
      ["reading", "1", "fill_blank", "", "저는 매일 아침 ___을 마십니다.", "빈칸에 들어갈 알맞은 말을 고르십시오.", "빈칸에 들어갈 말을 고르십시오.", "text", "물", "학교", "친구", "날씨", "1", "Động từ 마시다 đi với đồ uống.", "", "", "", "", "", "", ""],
      ["reading", "2", "long_passage", "reading-2-3", "민수 씨는 주말마다 도서관에 갑니다. 이번 주에는 한국 역사책을 읽었습니다.", "글을 읽고 물음에 답하십시오.", "민수 씨는 주말마다 어디에 갑니까?", "text", "학교", "도서관", "회사", "시장", "2", "Trong đoạn có câu 도서관에 갑니다.", "", "", "", "", "", "", ""],
      ["reading", "3", "long_passage", "reading-2-3", "", "글을 읽고 물음에 답하십시오.", "민수 씨는 이번 주에 무엇을 읽었습니까?", "text", "소설", "신문", "역사책", "잡지", "3", "Trong đoạn có cụm 한국 역사책.", "", "", "", "", "", "", ""],
      ["listening", "1", "standard", "", "", "다음을 듣고 알맞은 답을 고르십시오.", "남자는 무엇을 삽니까?", "text", "책", "우산", "가방", "신발", "2", "Người nam nói mua ô.", "listening-1", "남자: 우산을 주세요. 여자: 네, 여기 있습니다.", "", "", "", "", ""],
    ];
    const escapeCsv = (cell: string) => `"${cell.replaceAll('"', '""')}"`;
    const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "mau-import-de-topik.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    setImportMessage("Đã tải file mẫu. Có thể mở bằng Excel, sửa dữ liệu rồi nhập lại.");
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
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3"><p className="font-black text-emerald-800">Đáp án mở ngay sau khi nộp</p><p className="mt-1 text-xs font-semibold leading-5 text-emerald-700">Người học luôn xem được đáp án đúng và lời giải sau khi hoàn thành đề.</p></div>
        <label className="font-black">Thời gian Nghe<input name="listeningDurationMinutes" type="number" defaultValue={exam.listening_duration_minutes} disabled={!editable} className="mt-2 w-full rounded-2xl border px-4 py-3" /></label>
        <label className="font-black">Thời gian Đọc<input name="readingDurationMinutes" type="number" defaultValue={exam.reading_duration_minutes} disabled={!editable} className="mt-2 w-full rounded-2xl border px-4 py-3" /></label>
        <label className="font-black">Mô tả<input name="description" defaultValue={exam.description} disabled={!editable} className="mt-2 w-full rounded-2xl border px-4 py-3" /></label>
        <label className="font-black md:col-span-2">Hướng dẫn trước khi thi<textarea name="instructions" defaultValue={exam.instructions} disabled={!editable} className="mt-2 min-h-28 w-full rounded-2xl border px-4 py-3" /></label>
      </section>
      <section className="rounded-3xl bg-cyan-50 p-6">
        <div className="mb-5 flex gap-2"><button type="button" onClick={() => setActiveSection("listening")} className={`rounded-xl px-5 py-3 font-black ${activeSection === "listening" ? "bg-[#087eba] text-white" : "bg-white text-slate-600"}`}>Nghe · {questions.filter((q) => q.section === "listening").length}</button><button type="button" onClick={() => setActiveSection("reading")} className={`rounded-xl px-5 py-3 font-black ${activeSection === "reading" ? "bg-[#087eba] text-white" : "bg-white text-slate-600"}`}>Đọc · {questions.filter((q) => q.section === "reading").length}</button></div>
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-black">Câu {activeSection === "listening" ? "nghe" : "đọc"}</h2><p className="mt-1 text-sm font-semibold text-slate-600">{activeSection === "listening" ? "Câu đơn dùng một audio. Nhóm 2 câu chỉ tạo hoặc tải audio một lần." : "Chọn đúng dạng TOPIK; nhóm câu dùng chung đoạn văn hoặc hình chỉ nhập một lần."}</p></div>{editable && <div className="flex flex-wrap gap-2"><input ref={fileRef} type="file" accept=".xlsx,.csv" onChange={(e) => void importExcel(e)} className="sr-only" /><button type="button" onClick={downloadImportTemplate} className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-black text-slate-700">↓ Tải file mẫu</button><button type="button" onClick={() => fileRef.current?.click()} className="rounded-xl border border-cyan-300 bg-white px-4 py-2 font-black text-cyan-800">Nhập Excel/CSV</button>{activeSection === "listening" && <button type="button" onClick={addListeningGroup} className="rounded-xl border border-violet-300 bg-violet-50 px-4 py-2 font-black text-violet-700">+ Nhóm 2 câu</button>}{activeSection === "reading" && <button type="button" onClick={addReadingGroup} className="rounded-xl border border-violet-300 bg-violet-50 px-4 py-2 font-black text-violet-700">+ Nhóm 2 câu chung ngữ liệu</button>}<button type="button" onClick={() => setQuestions((q) => [...q, emptyQuestion(q.filter((item) => item.section === activeSection).length + 1, activeSection)])} className="rounded-xl bg-[#087eba] px-4 py-2 font-black text-white">+ {activeSection === "listening" ? "Câu đơn" : "Câu đọc"}</button></div>}</div>
        {activeSection === "reading" && <div className="mt-4 grid gap-3 rounded-2xl border border-sky-100 bg-white/80 p-4 text-sm md:grid-cols-3"><div><p className="font-black text-sky-800">Câu ngắn</p><p className="mt-1 font-semibold text-slate-600">Điền từ, cùng nghĩa, tranh, quảng cáo hoặc chọn tiêu đề.</p></div><div><p className="font-black text-violet-800">Nhóm dùng chung ngữ liệu</p><p className="mt-1 font-semibold text-slate-600">Một đoạn văn hoặc hình dùng cho 2 câu; chỉ nhập ngữ liệu một lần.</p></div><div><p className="font-black text-emerald-800">Import nhanh</p><p className="mt-1 font-semibold text-slate-600">Các dòng cùng passage_group sẽ tự dùng chung đoạn văn và ảnh.</p></div></div>}
        {importMessage && <p aria-live="polite" className="mt-4 rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-700">{importMessage}</p>}
        <div className="mt-5 space-y-5">{visibleQuestions.map((q, visibleIndex) => {
          const index = questions.indexOf(q);
          const groupMembers = q.section === "listening" && q.audioBlockKey
            ? visibleQuestions.filter((question) => question.audioBlockKey === q.audioBlockKey)
            : q.section === "reading" && q.passageBlockKey
              ? visibleQuestions.filter((question) => question.passageBlockKey === q.passageBlockKey)
              : [q];
          const isGrouped = groupMembers.length > 1;
          const firstGroupMember = groupMembers[0];
          const isGroupOwner = !isGrouped || firstGroupMember === q;
          const isAudioOwner = q.section === "listening" && isGroupOwner;
          const groupStart = visibleQuestions.indexOf(firstGroupMember) + 1;
          const groupEnd = visibleQuestions.indexOf(groupMembers[groupMembers.length - 1]) + 1;
          const groupLabel = `${groupStart}–${groupEnd}`;

          return <article key={`${q.id ?? "new"}-${index}`} className={`rounded-3xl border bg-white p-5 shadow-sm ${isGrouped ? "border-violet-200" : "border-cyan-100"}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-black">Câu {visibleIndex + 1}</h3>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${isGrouped ? "bg-violet-100 text-violet-700" : "bg-sky-100 text-sky-700"}`}>
                {isGrouped ? `Nhóm câu ${groupLabel}` : "Câu đơn"}
              </span>
              {isGrouped && !isGroupOwner && <span className="text-xs font-bold text-slate-500">Dùng chung {q.section === "listening" ? "audio" : "ngữ liệu"} câu {groupLabel}</span>}
            </div>
            {editable && <button type="button" onClick={() => removeQuestion(index)} className="text-sm font-black text-red-600">Xóa câu</button>}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {q.section === "reading" && <label className="font-bold">Dạng câu đọc<select value={q.readingType} disabled={!editable || (isGrouped && !isGroupOwner)} onChange={(e) => patchPassageBlock(index, { readingType: e.target.value as ExamReadingType, passage: q.passage, imageUrl: q.imageUrl })} className="mt-1 w-full rounded-xl border px-3 py-2.5">{readingTypeOptions.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>}
            <label className="font-bold">Loại đáp án<select value={q.answerType} disabled={!editable} onChange={(e) => patchQuestion(index, { answerType: e.target.value === "image" ? "image" : "text" })} className="mt-1 w-full rounded-xl border px-3 py-2.5"><option value="text">4 đáp án chữ</option><option value="image">4 đáp án ảnh</option></select></label>
            <label className="font-bold">Hướng dẫn<input value={q.instruction} disabled={!editable} onChange={(e) => patchQuestion(index, { instruction: e.target.value })} className="mt-1 w-full rounded-xl border px-3 py-2.5" /></label>
            <label className="font-bold">Câu hỏi hiển thị<input value={q.prompt} disabled={!editable} onChange={(e) => patchQuestion(index, { prompt: e.target.value })} className="mt-1 w-full rounded-xl border px-3 py-2.5" /></label>
          </div>
          {q.section === "reading" && isGroupOwner && <div className="mt-4 rounded-2xl border border-violet-100 bg-violet-50 p-4"><div className="mb-3 flex items-center justify-between gap-2"><p className="font-black text-violet-800">{isGrouped ? `Ngữ liệu chung cho câu ${groupLabel}` : "Ngữ liệu đọc"}</p>{isGrouped && <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-violet-700">Chỉ nhập một lần</span>}</div><label className="font-bold">Đoạn văn / thông báo / dữ liệu<textarea value={q.passage} disabled={!editable} onChange={(e) => patchPassageBlock(index, { passage: e.target.value, imageUrl: q.imageUrl, readingType: q.readingType })} className="mt-1 min-h-36 w-full rounded-xl border bg-white px-3 py-2.5" placeholder="Nhập ngữ liệu mà câu hỏi sử dụng. Với câu đơn ngắn có thể để trống." /></label><div className="mt-4"><ExamImageUpload examId={exam.id} value={q.imageUrl} onChange={(url) => patchPassageBlock(index, { imageUrl: url, passage: q.passage, readingType: q.readingType })} label="Ảnh ngữ liệu (không bắt buộc)" disabled={!editable} /></div></div>}
          {q.section === "reading" && isGrouped && !isGroupOwner && <div className="mt-4 rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm font-bold text-violet-700">Câu này dùng chung đoạn văn hoặc hình của nhóm câu {groupLabel}. Hãy sửa ngữ liệu tại câu {groupStart}.</div>}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">{q.options.map((option, optionIndex) => <div key={optionIndex} className="rounded-xl bg-slate-50 p-3"><label className="flex items-center gap-3"><input type="radio" checked={q.correctOption === optionIndex + 1} disabled={!editable} onChange={() => patchQuestion(index, { correctOption: optionIndex + 1 })} /><span className="font-black">{optionIndex + 1}</span><input value={option} disabled={!editable} onChange={(e) => { const options = [...q.options]; options[optionIndex] = e.target.value; patchQuestion(index, { options }); }} className="min-w-0 flex-1 bg-transparent outline-none" placeholder={q.answerType === "image" ? `Nhãn ảnh ${optionIndex + 1}` : `Đáp án ${optionIndex + 1}`} /></label>{q.answerType === "image" && <div className="mt-3"><ExamImageUpload examId={exam.id} value={q.optionImages[optionIndex]} onChange={(url) => { const optionImages = [...q.optionImages]; optionImages[optionIndex] = url; patchQuestion(index, { optionImages }); }} label={`Ảnh đáp án ${optionIndex + 1}`} compact disabled={!editable} /></div>}</div>)}</div>
          <label className="mt-4 block font-bold">Giải thích sau khi nộp<textarea value={q.explanation} disabled={!editable} onChange={(e) => patchQuestion(index, { explanation: e.target.value })} className="mt-1 min-h-20 w-full rounded-xl border px-3 py-2.5" /></label>
          {q.section === "listening" && isAudioOwner && <div className="mt-4 rounded-2xl bg-violet-50 p-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><p className="font-black text-violet-800">{isGrouped ? `Audio dùng chung cho câu ${groupLabel}` : `Audio câu ${visibleIndex + 1}`}</p><span className="rounded-full bg-white px-3 py-1 text-xs font-black text-violet-700">Chỉ tạo hoặc tải 1 lần</span></div><label className="font-bold">Nội dung Azure đọc <span className="text-xs text-slate-500">(không bắt buộc)</span><textarea value={q.audioText} disabled={!editable} onChange={(e) => patchAudioBlock(index, { audioText: e.target.value, audioUrl: q.audioUrl })} className="mt-1 min-h-20 w-full rounded-xl border bg-white px-3 py-2.5" /></label><div className="mt-3 flex flex-wrap items-center gap-2">{editable && <><button type="button" disabled={busyIndex !== null} onClick={() => void createAudio(index)} className="rounded-xl bg-violet-600 px-4 py-2 font-black text-white disabled:opacity-50">{busyIndex === index ? "Đang xử lý..." : "Tạo audio Azure"}</button><label className="cursor-pointer rounded-xl border border-violet-200 bg-white px-4 py-2 font-black text-violet-700">Tải audio<input type="file" accept="audio/mpeg,audio/mp4,audio/wav" onChange={(e) => void uploadAudio(index, e)} className="sr-only" /></label></>}{q.audioUrl ? <audio controls preload="none" src={q.audioUrl} className="h-10 max-w-full" /> : <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">Chưa có audio</span>}</div></div>}
          {q.section === "listening" && isGrouped && !isAudioOwner && <div className="mt-4 rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm font-bold text-violet-700">Câu này dùng chung audio của nhóm câu {groupLabel}. Bạn chỉ cần quản lý audio ở câu {groupStart}.</div>}
          {q.section === "listening" && <div className="mt-4 rounded-2xl bg-amber-50 p-4"><ExamImageUpload examId={exam.id} value={q.imageUrl} onChange={(url) => patchQuestion(index, { imageUrl: url })} label="Ảnh câu hỏi (không bắt buộc)" disabled={!editable} /></div>}
        </article>;
        })}</div>
        {!visibleQuestions.length && <p className="mt-5 rounded-2xl border-2 border-dashed border-cyan-200 bg-white p-8 text-center font-bold text-slate-500">Chưa có câu {activeSection === "listening" ? "nghe" : "đọc"}. Thêm thủ công hoặc nhập Excel/CSV.</p>}
      </section>
      {editable && <div className="sticky bottom-4 rounded-2xl border bg-white/95 p-4 shadow-xl backdrop-blur"><div className="flex items-center justify-between gap-4"><p aria-live="polite" className={`font-bold ${state.ok ? "text-emerald-700" : "text-red-700"}`}>{state.message || `${questions.length} câu · ${ready ? "đủ điều kiện gửi duyệt" : eligibility.issues[0] ?? "còn thiếu đáp án"}`}</p><button disabled={pending} className="rounded-xl bg-[#10243e] px-5 py-3 font-black text-white disabled:opacity-50">{pending ? "Đang lưu..." : hotfix ? "Áp dụng hotfix" : reviewEdit ? "Lưu chỉnh sửa nhanh" : "Lưu bản nháp"}</button></div></div>}
    </form>
  </main>;
}
