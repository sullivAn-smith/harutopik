"use client";

import { ChangeEvent, useActionState, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { readSheet } from "read-excel-file/browser";
import { saveExamDraft, submitExamForReview } from "./actions";
import { createClient } from "@/lib/supabase/client";
import { getExamEligibility, type ExamQuestionInput, type ExamSection } from "@/lib/exams/types";
import { parseCsv, parseExamImportRows } from "./exam-import";
import { mergeExamImportQuestions } from "./exam-import-template";
import { hotfixPublishedExam } from "./exam-hotfix-actions";
import { normalizeExamQuestion, type StoredExamQuestion } from "./normalize-exam-question";
import type { ExamAnswerReviewPolicy, ExamLevel } from "@/lib/exams/types";
import { ExamImageUpload } from "./exam-image-upload";
import { completeExamSkeleton, getExamTemplateGroups, getFixedExamQuestionCopy, shouldHideTopikIReadingPassage } from "@/lib/exams/exam-template";

type ExamForEditor = {
  id: string; code: string; title: string; description: string; duration_minutes: number;
  listening_duration_minutes: number; reading_duration_minutes: number;
  level: ExamLevel; answer_review_policy: ExamAnswerReviewPolicy; answer_review_available_at: string | null;
  instructions: string; status: string; review_note: string | null; exam_questions: StoredExamQuestion[];
  updated_at: string; previewed_at?: string | null;
};

export function ExamEditor({ exam, error, hotfix = false, reviewEdit = false, initialSection = "listening", history = [] }: { exam: ExamForEditor; error?: string; hotfix?: boolean; reviewEdit?: boolean; initialSection?: ExamSection; history?: Array<{ id: string; version: number; status: string; created_at: string }> }) {
  const localDraftKey = `harutopik:exam-draft:${exam.id}`;
  const save = hotfix ? hotfixPublishedExam.bind(null, exam.id) : saveExamDraft.bind(null, exam.id);
  const [state, action, pending] = useActionState(save, { ok: false, message: "" });
  const [questions, setQuestions] = useState<ExamQuestionInput[]>(() => completeExamSkeleton(exam.level, (exam.exam_questions ?? []).map(normalizeExamQuestion)));
  const [activeSection, setActiveSection] = useState<ExamSection>(initialSection);
  const levelTemplateGroups = getExamTemplateGroups(exam.level);
  const sectionGroups = levelTemplateGroups.filter((row) => row.section === activeSection);
  const [activeQuestionRange, setActiveQuestionRange] = useState({ section: initialSection, start: 1, end: 1 });
  const [busyIndex, setBusyIndex] = useState<number | null>(null);
  const [importMessage, setImportMessage] = useState("");
  const [formRevision, setFormRevision] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const lastTextFieldRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const initialSerialized = useRef("");
  const imageSavePending = useRef(false);
  const importSavePending = useRef(false);
  const importSaveWasPending = useRef(false);
  const skipInitialLocalPersist = useRef(true);
  const [unlockedFixedFields, setUnlockedFixedFields] = useState<Set<string>>(() => new Set());
  const editable = hotfix || reviewEdit || ["draft", "changes_requested"].includes(exam.status);
  const readingNumberOffset = exam.level === "topik_i" ? 30 : 0;
  const displayQuestionNumber = (question: Pick<ExamQuestionInput, "section" | "position">) => question.position + (question.section === "reading" ? readingNumberOffset : 0);
  const eligibility = getExamEligibility(questions);
  const hasCurrentPreview = exam.previewed_at === undefined || Boolean(exam.previewed_at && exam.previewed_at >= exam.updated_at);
  const ready = eligibility.eligible && questions.every((q) => q.options.every(Boolean)) && hasCurrentPreview;
  const incompleteQuestionCount = questions.filter((question) => {
    const hasContent = Boolean(question.prompt.trim() || question.passage.trim() || question.audioUrl.trim() || question.audioText.trim());
    const hasOptions = question.options.every((option) => option.trim());
    const hasRequiredImages = question.answerType !== "image" || question.optionImages.every((url) => url.trim());
    return !hasContent || !hasOptions || !hasRequiredImages;
  }).length;

  const serialized = useMemo(() => JSON.stringify(questions.map((q) => ({ ...q, position: questions.filter((item) => item.section === q.section).indexOf(q) + 1 }))), [questions]);
  const groupStart = activeQuestionRange.section === activeSection ? activeQuestionRange.start : 1;
  const groupEnd = activeQuestionRange.section === activeSection ? activeQuestionRange.end : 1;
  const selectedGroupDisplayRange = `${groupStart + (activeSection === "reading" ? readingNumberOffset : 0)}${groupEnd > groupStart ? `–${groupEnd + (activeSection === "reading" ? readingNumberOffset : 0)}` : ""}`;
  const visibleQuestions = questions.filter((question) => question.section === activeSection && question.position >= groupStart && question.position <= groupEnd);
  const questionNavigation = (() => {
    const sectionQuestions = questions.filter((question) => question.section === activeSection).sort((a, b) => a.position - b.position);
    const items: Array<{ key: string; start: number; end: number; questions: ExamQuestionInput[] }> = [];
    for (const templateGroup of sectionGroups) {
      const [start, end] = templateGroup.range.split("–").map(Number);
      const sharedSize = templateGroup.flow === "shared" ? templateGroup.sharedSize ?? 2 : 1;
      for (let rangeStart = start; rangeStart <= end; rangeStart += sharedSize) {
        const rangeEnd = Math.min(end, rangeStart + sharedSize - 1);
        const members = sectionQuestions.filter((question) => question.position >= rangeStart && question.position <= rangeEnd);
        items.push({ key: `${activeSection}-${rangeStart}-${rangeEnd}`, start: rangeStart, end: rangeEnd, questions: members });
      }
    }
    return items;
  })();

  useEffect(() => {
    if (!editable || hotfix || reviewEdit) return;
    let restoreTimer: number | undefined;
    try {
      const raw = window.localStorage.getItem(localDraftKey);
      if (!raw) return;
      const cached = JSON.parse(raw) as { questions?: ExamQuestionInput[]; fields?: Record<string, string> };
      restoreTimer = window.setTimeout(() => {
        if (Array.isArray(cached.questions)) setQuestions(completeExamSkeleton(exam.level, cached.questions));
        setImportMessage("Đã khôi phục nội dung chưa kịp đồng bộ từ lần chỉnh sửa trước.");
      }, 0);
      for (const [name, value] of Object.entries(cached.fields ?? {})) {
        const field = formRef.current?.elements.namedItem(name);
        if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement) field.value = value;
      }
    } catch {
      window.localStorage.removeItem(localDraftKey);
    }
    return () => { if (restoreTimer !== undefined) window.clearTimeout(restoreTimer); };
  }, [editable, exam.level, hotfix, localDraftKey, reviewEdit]);

  useEffect(() => {
    if (!editable || hotfix || reviewEdit || !formRef.current) return;
    if (skipInitialLocalPersist.current) { skipInitialLocalPersist.current = false; return; }
    const formData = new FormData(formRef.current);
    const fields = Object.fromEntries(["code", "title", "description", "listeningDurationMinutes", "readingDurationMinutes", "instructions"].map((name) => [name, String(formData.get(name) ?? "")]));
    window.localStorage.setItem(localDraftKey, JSON.stringify({ questions, fields, savedAt: new Date().toISOString() }));
  }, [editable, formRevision, hotfix, localDraftKey, questions, reviewEdit]);

  function selectSection(section: ExamSection) {
    setActiveSection(section);
    setActiveQuestionRange({ section, start: 1, end: 1 });
  }
  useEffect(() => {
    if (!editable || hotfix || reviewEdit) return;
    if (!initialSerialized.current) { initialSerialized.current = serialized; return; }
    if (serialized === initialSerialized.current && formRevision === 0) return;
    if (imageSavePending.current) return;
    if (importSavePending.current) return;
    const timer = window.setTimeout(() => formRef.current?.requestSubmit(), 1800);
    return () => window.clearTimeout(timer);
  }, [editable, formRevision, hotfix, reviewEdit, serialized]);

  useEffect(() => {
    if (!imageSavePending.current) return;
    imageSavePending.current = false;
    formRef.current?.requestSubmit();
  }, [serialized]);

  useEffect(() => {
    if (!importSavePending.current) return;
    formRef.current?.requestSubmit();
  }, [serialized]);

  useEffect(() => {
    if (!importSavePending.current) return;
    if (pending) {
      importSaveWasPending.current = true;
      return;
    }
    if (!importSaveWasPending.current || !state.message) return;
    importSavePending.current = false;
    importSaveWasPending.current = false;
    setImportMessage(state.ok
      ? `Đã nhập file và tự động lưu vào bản nháp. ${state.message}`
      : `File đã được điền lên giao diện nhưng chưa lưu được: ${state.message}`);
  }, [pending, state]);

  function saveImageImmediately() {
    if (hotfix) {
      setImportMessage("Ảnh đã được tải lên. Nhập lý do rồi bấm “Áp dụng hotfix” để đồng bộ tới học viên.");
      return;
    }
    imageSavePending.current = true;
    setImportMessage("Ảnh đã tải lên CDN. Đang lưu vào đề và đồng bộ bản xem trước...");
  }
  function patchQuestion(index: number, patch: Partial<ExamQuestionInput>) {
    setQuestions((current) => current.map((q, i) => i === index ? { ...q, ...patch } : q));
  }

  function toggleFixedField(question: ExamQuestionInput, field: "instruction" | "prompt") {
    const key = `${question.section}:${question.position}:${field}`;
    setUnlockedFixedFields((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function insertExamCharacter(character: string) {
    const field = lastTextFieldRef.current;
    if (!field || !document.contains(field) || field.disabled || field.readOnly) {
      setImportMessage("Hãy đặt con trỏ vào ô cần nhập rồi bấm ký tự.");
      return;
    }
    const start = field.selectionStart ?? field.value.length;
    const end = field.selectionEnd ?? start;
    const nextValue = `${field.value.slice(0, start)}${character}${field.value.slice(end)}`;
    const prototype = field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const valueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    valueSetter?.call(field, nextValue);
    field.dispatchEvent(new Event("input", { bubbles: true }));
    window.requestAnimationFrame(() => {
      field.focus();
      field.setSelectionRange(start + character.length, start + character.length);
    });
  }

  function patchAudioBlock(index: number, patch: Pick<ExamQuestionInput, "audioUrl" | "audioText">) {
    const blockKey = questions[index]?.audioBlockKey.trim();
    setQuestions((current) => current.map((question, questionIndex) =>
      questionIndex === index || (blockKey && question.audioBlockKey === blockKey)
        ? { ...question, ...patch }
        : question,
    ));
  }

  function patchPassageBlock(index: number, patch: Partial<Pick<ExamQuestionInput, "passage" | "imageUrl" | "readingType" | "underlinedText" | "audioText">>) {
    const blockKey = questions[index]?.passageBlockKey.trim();
    setQuestions((current) => current.map((question, questionIndex) =>
      questionIndex === index || (blockKey && question.passageBlockKey === blockKey)
        ? { ...question, ...patch }
        : question,
    ));
  }

  async function createAudio(index: number) {
    const question = questions[index];
    if (!question.audioText.trim()) { setImportMessage(`Câu ${question.position}: hãy nhập nội dung cần đọc.`); return; }
    setBusyIndex(index);
    setImportMessage(`Đang tạo audio cho câu ${question.position}...`);
    try {
      const response = await fetch("/api/v1/tts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: question.audioText }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message ?? "Không thể tạo audio.");
      patchAudioBlock(index, { audioUrl: body.data.audioUrl, audioText: question.audioText });
      setImportMessage(`Câu ${question.position}: audio Azure đã sẵn sàng${body.data.cached ? " (dùng cache)" : ""}.`);
    } catch (audioError) { setImportMessage(audioError instanceof Error ? audioError.message : "Không thể tạo audio."); }
    finally { setBusyIndex(null); }
  }

  async function uploadAudio(index: number, event: ChangeEvent<HTMLInputElement>) {
    const question = questions[index];
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    if (!new Set(["audio/mpeg", "audio/mp4", "audio/wav", "audio/x-wav"]).has(file.type)) { setImportMessage("Chỉ hỗ trợ MP3, M4A hoặc WAV."); return; }
    if (file.size > 15 * 1024 * 1024) { setImportMessage("Audio vượt quá 15 MB."); return; }
    setBusyIndex(index); setImportMessage(`Đang tải audio câu ${question.position}...`);
    const supabase = createClient();
    const extension = file.name.split(".").pop()?.toLowerCase() || "mp3";
    const path = `${exam.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("exam-audio").upload(path, file, { contentType: file.type, cacheControl: "31536000" });
    if (uploadError) setImportMessage(`Tải audio thất bại: ${uploadError.message}`);
    else {
      const url = supabase.storage.from("exam-audio").getPublicUrl(path).data.publicUrl;
      patchAudioBlock(index, { audioUrl: url, audioText: question.audioText }); setImportMessage(`Câu ${question.position}: đã tải audio lên CDN.`);
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
      if (importedSections.size !== 1 || !importedSections.has(activeSection)) {
        throw new Error(`File này phải là mẫu phần ${activeSection === "listening" ? "Nghe" : "Đọc"} đang mở.`);
      }
      importSavePending.current = !hotfix;
      setQuestions((current) => mergeExamImportQuestions(exam.level, current, imported));
      setImportMessage(hotfix
        ? `Đã điền ${imported.length} câu. Nhập lý do rồi bấm “Áp dụng hotfix” để đồng bộ.`
        : `Đã điền ${imported.length} câu vào đúng vị trí. Đang tự động lưu bản nháp và đồng bộ bản xem trước...`);
    } catch (importError) { setImportMessage(importError instanceof Error ? importError.message : "Không thể đọc file Excel."); }
  }

  function downloadImportTemplate() {
    const anchor = document.createElement("a");
    const fileName = `mau-nhap-${exam.level === "topik_ii" ? "topik-ii" : "topik-i"}-${activeSection === "listening" ? "nghe" : "doc"}.xlsx`;
    anchor.href = `/templates/${fileName}`;
    anchor.download = fileName;
    anchor.click();
    const sectionCount = questions.filter((question) => question.section === activeSection).length;
    setImportMessage(`Đã tải file Excel mẫu ${activeSection === "listening" ? "Nghe" : "Đọc"} gồm ${sectionCount} câu. Chọn 1–4 ở cột correct_option; khi nhập lên hệ thống sẽ tự tích đáp án đúng.`);
  }

  return <main className="mx-auto max-w-6xl px-5 py-10">
    <Link href={hotfix || reviewEdit ? `/quan-tri/de-thi/${exam.id}` : "/bien-tap/de-thi"} className="font-black text-[#087eba]">← {hotfix || reviewEdit ? "Quay lại duyệt đề" : "Ngân hàng đề"}</Link>
    <div className="mt-5 flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-widest text-cyan-700">{exam.level === "topik_ii" ? "TOPIK II" : "TOPIK I"} · {hotfix ? "Hotfix bản phát hành" : exam.status}</p><h1 className="mt-2 text-4xl font-black">{exam.title}</h1></div><div className="flex flex-wrap gap-2"><Link href={`/bien-tap/de-thi/${exam.id}/xem-truoc`} className="rounded-2xl border border-cyan-300 bg-white px-5 py-3 font-black text-cyan-800">▶ Xem như người học</Link>{editable && !hotfix && <form action={submitExamForReview} onSubmit={(event) => { if (incompleteQuestionCount > 0 && !window.confirm(`Đề còn ${incompleteQuestionCount} câu chưa soạn hoàn chỉnh. Bạn vẫn muốn gửi admin duyệt?`)) event.preventDefault(); }}><input type="hidden" name="examId" value={exam.id} /><input type="hidden" name="allowIncomplete" value="1" /><button title={incompleteQuestionCount > 0 ? `Còn ${incompleteQuestionCount} câu chưa soạn` : undefined} className="rounded-2xl bg-emerald-600 px-5 py-3 font-black text-white">Gửi admin duyệt →</button></form>}</div></div>
    {editable && incompleteQuestionCount > 0 && <p className="mt-4 rounded-2xl bg-orange-50 px-4 py-3 text-sm font-bold text-orange-800">Đề còn {incompleteQuestionCount}/{questions.length} câu chưa soạn hoàn chỉnh. Bạn vẫn có thể gửi duyệt để kiểm thử quy trình.</p>}
    {editable && !hasCurrentPreview && <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">Sau khi hoàn thiện và lưu, hãy xem trước như người học. Đây là bước bắt buộc trước khi gửi duyệt.</p>}
    {(error || exam.review_note) && <p role="alert" className="mt-5 rounded-2xl bg-amber-50 p-4 font-bold text-amber-800">{error ?? `Admin yêu cầu: ${exam.review_note}`}</p>}
    {reviewEdit && <p className="mt-5 rounded-2xl bg-violet-50 p-4 font-bold text-violet-800">Chỉnh sửa nhanh của admin: lưu xong đề vẫn ở hàng chờ duyệt để bạn kiểm tra và ra quyết định.</p>}
    {!editable && <p className="mt-5 rounded-2xl bg-sky-50 p-4 font-bold text-sky-800">Đề đang trong quy trình duyệt nên hiện chỉ được xem.</p>}
    <form ref={formRef} action={action} onFocusCapture={(event) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) lastTextFieldRef.current = event.target;
    }} onChange={() => setFormRevision((value) => value + 1)} className="mt-7 space-y-6">
      <input type="hidden" name="questions" value={serialized} />
      {hotfix && <label className="block rounded-3xl border border-amber-200 bg-amber-50 p-6 font-black">Lý do hotfix<textarea name="hotfixReason" required className="mt-2 min-h-24 w-full rounded-2xl border bg-white px-4 py-3" placeholder="Mô tả lỗi và nội dung cần áp dụng cho learner..." /></label>}
      <section className="grid gap-4 rounded-3xl bg-white p-6 shadow-sm md:grid-cols-2">
        <label className="font-black">Mã đề<input name="code" defaultValue={exam.code} disabled={!editable} className="mt-2 w-full rounded-2xl border px-4 py-3" /></label>
        <label className="font-black">Tên đề<input name="title" defaultValue={exam.title} disabled={!editable} className="mt-2 w-full rounded-2xl border px-4 py-3" /></label>
        <label className="font-black">Trình độ<input type="hidden" name="level" value={exam.level} /><span className="mt-2 block w-full rounded-2xl border bg-slate-50 px-4 py-3">{exam.level === "topik_ii" ? "TOPIK II · 100 câu" : "TOPIK I · 70 câu"}</span></label>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3"><p className="font-black text-emerald-800">Đáp án mở ngay sau khi nộp</p><p className="mt-1 text-xs font-semibold leading-5 text-emerald-700">Người học luôn xem được đáp án đúng và lời giải sau khi hoàn thành đề.</p></div>
        <label className="font-black">Thời gian Nghe<input name="listeningDurationMinutes" type="number" defaultValue={exam.listening_duration_minutes} disabled={!editable} className="mt-2 w-full rounded-2xl border px-4 py-3" /></label>
        <label className="font-black">Thời gian Đọc<input name="readingDurationMinutes" type="number" defaultValue={exam.reading_duration_minutes} disabled={!editable} className="mt-2 w-full rounded-2xl border px-4 py-3" /></label>
        <label className="font-black">Mô tả<input name="description" defaultValue={exam.description} disabled={!editable} className="mt-2 w-full rounded-2xl border px-4 py-3" /></label>
        <label className="font-black md:col-span-2">Hướng dẫn trước khi thi<textarea name="instructions" defaultValue={exam.instructions} disabled={!editable} className="mt-2 min-h-28 w-full rounded-2xl border px-4 py-3" /></label>
      </section>
      <section className="rounded-3xl bg-cyan-50 p-6">
        <div className="mb-5 flex gap-2"><button type="button" onClick={() => selectSection("listening")} className={`rounded-xl px-5 py-3 font-black ${activeSection === "listening" ? "bg-[#087eba] text-white" : "bg-white text-slate-600"}`}>Nghe · {questions.filter((q) => q.section === "listening").length}</button><button type="button" onClick={() => selectSection("reading")} className={`rounded-xl px-5 py-3 font-black ${activeSection === "reading" ? "bg-[#087eba] text-white" : "bg-white text-slate-600"}`}>Đọc · {questions.filter((q) => q.section === "reading").length}</button></div>
        <div className="mb-5 rounded-2xl border border-cyan-100 bg-white/85 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><p className="font-black text-slate-800">Chọn câu để biên tập</p><p className="text-xs font-bold text-slate-500">Câu dùng chung được gộp thành một nút</p></div>
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-10">{questionNavigation.map((item) => {
            const offset = activeSection === "reading" ? readingNumberOffset : 0;
            const displayStart = item.start + offset;
            const displayEnd = item.end + offset;
            const label = displayEnd > displayStart ? `${displayStart}–${displayEnd}` : String(displayStart);
            const completed = item.questions.every((question) => {
              const fixedCopy = getFixedExamQuestionCopy(exam.level, question.section, question.position);
              return (fixedCopy?.prompt !== undefined || Boolean(question.prompt.trim()))
                && question.options.every(Boolean);
            });
            const selected = groupStart === item.start && groupEnd === item.end;
            return <button key={item.key} type="button" onClick={() => setActiveQuestionRange({ section: activeSection, start: item.start, end: item.end })} aria-label={`Mở câu ${label}`} className={`min-h-11 rounded-xl border px-2 py-2 text-sm font-black transition ${selected ? "border-cyan-600 bg-[#087eba] text-white shadow-sm" : completed ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-cyan-400" : "border-slate-200 bg-white text-slate-700 hover:border-cyan-400 hover:bg-cyan-50"}`}>{label}</button>;
          })}</div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-black">Câu {selectedGroupDisplayRange}</h2>{editable && <div className="flex flex-wrap gap-2"><input ref={fileRef} type="file" accept=".xlsx,.csv" onChange={(e) => void importExcel(e)} className="sr-only" /><button type="button" onClick={downloadImportTemplate} className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-black text-slate-700">↓ File mẫu</button><button type="button" onClick={() => fileRef.current?.click()} className="rounded-xl border border-cyan-300 bg-white px-4 py-2 font-black text-cyan-800">Nhập Excel/CSV</button></div>}</div>
        {activeSection === "reading" && <div className="mt-4 grid gap-3 rounded-2xl border border-sky-100 bg-white/80 p-4 text-sm md:grid-cols-3"><div><p className="font-black text-sky-800">Câu ngắn</p><p className="mt-1 font-semibold text-slate-600">Điền từ, cùng nghĩa, tranh, quảng cáo hoặc chọn tiêu đề.</p></div><div><p className="font-black text-violet-800">Nhóm dùng chung ngữ liệu</p><p className="mt-1 font-semibold text-slate-600">Một đoạn văn hoặc hình dùng cho 2 câu; chỉ nhập ngữ liệu một lần.</p></div><div><p className="font-black text-emerald-800">Import nhanh</p><p className="mt-1 font-semibold text-slate-600">Các dòng cùng passage_group sẽ tự dùng chung đoạn văn và ảnh.</p></div></div>}
        {importMessage && <p aria-live="polite" className="mt-4 rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-700">{importMessage}</p>}
        <div className="mt-5 space-y-5">{visibleQuestions.map((q) => {
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
          const groupStart = displayQuestionNumber(firstGroupMember);
          const groupEnd = displayQuestionNumber(groupMembers[groupMembers.length - 1]);
          const groupLabel = `${groupStart}–${groupEnd}`;
          const usesImageAnswers = q.answerType === "image"
            || (exam.level === "topik_ii" && q.section === "listening" && q.position >= 1 && q.position <= 3);
          const isTopikIIReading = exam.level === "topik_ii" && q.section === "reading";
          const needsQuestionImage = q.section === "reading" && (
            (exam.level === "topik_i" && ["image_match", "practical_info"].includes(q.readingType))
            || (exam.level === "topik_ii" && q.position >= 5 && q.position <= 10)
          );
          const showQuestionImageUpload = needsQuestionImage && q.section === "listening";
          const showsPrimaryPrompt = exam.level === "topik_ii" || !(isTopikIIReading && (
            (q.position >= 5 && q.position <= 14)
            || (q.position >= 16 && q.position <= 18)
            || (q.position >= 28 && q.position <= 38)
          ));
          const isTopikIReadingQuestion59 = exam.level === "topik_i" && q.section === "reading" && q.position === 29;
          const instructionFieldKey = `${q.section}:${q.position}:instruction`;
          const promptFieldKey = `${q.section}:${q.position}:prompt`;
          const instructionUnlocked = unlockedFixedFields.has(instructionFieldKey);
          const promptUnlocked = unlockedFixedFields.has(promptFieldKey);
          const canEditPrimaryPrompt = promptUnlocked || exam.level === "topik_ii" || (exam.level === "topik_i" && (
            (q.section === "listening" && q.position >= 29 && q.position <= 30)
            || (q.section === "reading"
              && q.position >= 1
              && q.position <= 40
              && ![30, 32, 34, 36, 38, 40].includes(q.position))
          ));
          const canEditInstruction = instructionUnlocked;
          const showsSecondaryPrompt = isTopikIReadingQuestion59 || (isTopikIIReading && ((q.position >= 39 && q.position <= 41) || q.position === 46));
          const showsUnderlinedText = isTopikIIReading && (q.position === 3 || q.position === 4);
          const showsLargePrimaryPrompt = isTopikIIReading && q.position >= 39 && q.position <= 41;
          const showsPassageUnderlinedText = isTopikIIReading && isGroupOwner && (q.position === 42 || q.position === 48);
          const hidesReadingPassage = q.section === "reading" && (
            shouldHideTopikIReadingPassage(exam.level, q.section, q.position)
            || (exam.level === "topik_i" && q.position >= 33 && q.position <= 34)
            || (exam.level === "topik_ii" && ((q.position >= 1 && q.position <= 10) || (q.position >= 25 && q.position <= 27) || (q.position >= 39 && q.position <= 41)))
          );
          const showsReadingPassage = !hidesReadingPassage;
          const showsInstructionField = !(isGrouped && !isGroupOwner && (
            q.section === "reading"
            || (exam.level === "topik_ii" && q.section === "listening")
          ));
          return <article key={`${q.id ?? "new"}-${index}`} className={`rounded-3xl border bg-white p-5 shadow-sm ${isGrouped ? "border-violet-200" : "border-cyan-100"}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-black">Câu {displayQuestionNumber(q)}</h3>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${isGrouped ? "bg-violet-100 text-violet-700" : "bg-sky-100 text-sky-700"}`}>
                {isGrouped ? `Nhóm câu ${groupLabel}` : "Câu đơn"}
              </span>
              {isGrouped && !isGroupOwner && <span className="text-xs font-bold text-slate-500">Dùng chung {q.section === "listening" ? "audio" : "ngữ liệu"} câu {groupLabel}</span>}
            </div>
            <span className="text-xs font-bold text-slate-400">Vị trí cố định trong khung đề</span>
          </div>
          <div className={`mt-4 grid gap-4 ${q.section === "reading" && isGrouped && !isGroupOwner ? "" : showsUnderlinedText ? "md:grid-cols-3" : showsPrimaryPrompt ? "md:grid-cols-2" : ""}`}>
            {showsInstructionField && <label className="font-bold"><span className="flex items-center justify-between gap-2"><span>Tiêu đề {!canEditInstruction && <span className="ml-1 text-xs font-black text-emerald-700">Cố định</span>}</span>{editable && <button type="button" onClick={() => toggleFixedField(q, "instruction")} className="rounded-lg border border-cyan-200 bg-white px-2.5 py-1 text-xs font-black text-cyan-800">{canEditInstruction ? "Khóa lại" : "Sửa"}</button>}</span><input value={q.instruction} disabled={!editable || !canEditInstruction} onChange={(event) => patchQuestion(index, { instruction: event.target.value })} className={`mt-1 w-full rounded-xl border px-3 py-2.5 outline-none ${canEditInstruction ? "border-cyan-400 bg-white text-slate-900" : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500"}`} placeholder={canEditInstruction ? "Nhập tiêu đề" : "Tiêu đề cố định theo khung đề"} /></label>}
            {showsPrimaryPrompt && <label className={`font-bold ${showsLargePrimaryPrompt ? "md:col-span-2" : ""}`}><span className="flex items-center justify-between gap-2"><span>{showsLargePrimaryPrompt ? "Câu hỏi hiển thị 1" : q.section === "reading" && isGrouped ? `Câu hỏi ${displayQuestionNumber(q)}` : "Câu hỏi hiển thị"} {!canEditPrimaryPrompt && <span className="ml-1 text-xs font-black text-emerald-700">Cố định</span>}</span>{editable && !canEditPrimaryPrompt && <button type="button" onClick={() => toggleFixedField(q, "prompt")} className="rounded-lg border border-cyan-200 bg-white px-2.5 py-1 text-xs font-black text-cyan-800">Sửa</button>}{editable && promptUnlocked && <button type="button" onClick={() => toggleFixedField(q, "prompt")} className="rounded-lg border border-cyan-200 bg-white px-2.5 py-1 text-xs font-black text-cyan-800">Khóa lại</button>}</span>{showsLargePrimaryPrompt ? <textarea value={q.prompt} disabled={!editable || !canEditPrimaryPrompt} onChange={(event) => patchQuestion(index, { prompt: event.target.value })} className={`mt-1 min-h-24 w-full rounded-xl border px-3 py-2.5 text-slate-900 ${canEditPrimaryPrompt ? "border-cyan-400 bg-white" : "cursor-not-allowed border-slate-200 bg-slate-100"}`} placeholder="Nhập câu hỏi hiển thị 1" /> : <input value={q.prompt} disabled={!editable || !canEditPrimaryPrompt} onChange={(event) => patchQuestion(index, { prompt: event.target.value })} className={`mt-1 w-full rounded-xl border px-3 py-2.5 ${canEditPrimaryPrompt ? "border-cyan-400 bg-white text-slate-900" : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500"}`} placeholder={canEditPrimaryPrompt ? "Nhập câu hỏi hiển thị" : "Câu hỏi cố định theo khung đề"} />}</label>}
            {showsUnderlinedText && <label className="font-bold">Từ được gạch chân<input value={q.underlinedText ?? ""} disabled={!editable} onChange={(event) => patchQuestion(index, { underlinedText: event.target.value, audioText: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 outline-none" placeholder="Nhập đúng từ hoặc cụm từ trong câu" /></label>}
          </div>
          {showsSecondaryPrompt && <label className="mt-4 block font-bold">{isTopikIReadingQuestion59 ? "Câu hỏi riêng 2" : "Câu hỏi hiển thị 2"}<textarea value={q.audioText} disabled={!editable} onChange={(e) => patchQuestion(index, { audioText: e.target.value })} className="mt-1 min-h-24 w-full rounded-xl border bg-white px-3 py-2.5" placeholder={isTopikIReadingQuestion59 ? "Nhập câu hoặc nội dung cần đóng khung" : "Nhập câu hoặc nội dung trong khung <보기>"} /></label>}
          {q.section === "reading" && needsQuestionImage && (!isGrouped || isGroupOwner) && <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-4"><p className="mb-3 font-black text-sky-800">{isGrouped ? `Ảnh đề dùng chung cho câu ${groupLabel}` : `Ảnh đề câu ${displayQuestionNumber(q)}`}</p><ExamImageUpload examId={exam.id} value={q.imageUrl} onChange={(url) => patchPassageBlock(index, { imageUrl: url, passage: q.passage, readingType: q.readingType })} onSaved={saveImageImmediately} label="Tải ảnh đề lên" preserveFullImage={exam.level === "topik_ii"} disabled={!editable} /></div>}
          {q.section === "reading" && isGroupOwner && showsReadingPassage && <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 p-4"><div className="mb-3 flex items-center justify-between gap-2"><p className="font-black text-violet-800">{isGrouped ? `Bài đọc chung cho câu ${groupLabel}` : "Ngữ liệu đọc"}</p>{isGrouped && <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-violet-700">Nhập một lần · dùng cho {groupMembers.length} câu</span>}</div><div className={`grid gap-4 ${showsPassageUnderlinedText ? "md:grid-cols-[minmax(0,2fr)_minmax(240px,1fr)]" : ""}`}><label className="font-bold">Nội dung bài đọc chung<textarea value={q.passage} disabled={!editable} onChange={(e) => patchPassageBlock(index, { passage: e.target.value, imageUrl: q.imageUrl, readingType: q.readingType })} className="mt-1 min-h-44 w-full rounded-xl border bg-white px-3 py-2.5" placeholder={isGrouped ? "Nhập toàn bộ đoạn văn tại đây. Có thể chèn vị trí trống bằng ký hiệu ①, ②..." : "Nhập ngữ liệu mà câu hỏi sử dụng. Với câu đơn ngắn có thể để trống."} /></label>{showsPassageUnderlinedText && <label className="font-bold">Từ được gạch chân trong bài đọc<textarea value={q.underlinedText ?? ""} disabled={!editable} onChange={(event) => patchQuestion(index, { underlinedText: event.target.value, audioText: event.target.value })} className="mt-1 min-h-44 w-full rounded-xl border bg-white px-3 py-2.5" placeholder="Nhập đúng từ hoặc cụm từ xuất hiện trong bài đọc" /></label>}</div></div>}
          {q.section === "reading" && isGrouped && !isGroupOwner && <div className="mt-4 rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm font-bold text-violet-700">Câu này dùng chung đoạn văn hoặc hình của nhóm câu {groupLabel}. Hãy sửa ngữ liệu tại câu {groupStart}.</div>}
          <p className="mt-4 text-xs font-black uppercase tracking-widest text-emerald-700">{usesImageAnswers ? "Tải 4 ảnh đáp án" : q.section === "reading" && isGrouped ? `Nhập 4 đáp án của câu ${displayQuestionNumber(q)}` : "Chọn đáp án đúng"}</p>
          <div className={`mt-2 ${showQuestionImageUpload ? "grid items-start gap-5 lg:grid-cols-[minmax(260px,0.8fr)_minmax(360px,1.2fr)]" : ""}`}>
            {showQuestionImageUpload && <ExamImageUpload examId={exam.id} value={q.imageUrl} onChange={(url) => q.section === "reading" ? patchPassageBlock(index, { imageUrl: url, passage: q.passage, readingType: q.readingType }) : patchQuestion(index, { imageUrl: url })} onSaved={saveImageImmediately} label={isGrouped ? `Ảnh đề dùng chung cho câu ${groupLabel}` : "Ảnh / bảng / biểu đồ của câu hỏi"} compact preserveFullImage={exam.level === "topik_ii" && q.section === "reading"} disabled={!editable} />}
            <div className={`grid gap-3 ${showQuestionImageUpload ? "grid-cols-1" : "sm:grid-cols-2"}`}>{q.options.map((option, optionIndex) => {
              const selected = q.correctOption === optionIndex + 1;
              return <div key={optionIndex} className={`rounded-xl border-2 p-3 transition ${selected ? "border-emerald-600 bg-emerald-50 shadow-sm" : "border-slate-200 bg-slate-50"}`}>
                {usesImageAnswers ? <>
                  <ExamImageUpload examId={exam.id} value={q.optionImages[optionIndex]} onChange={(url) => { const optionImages = [...q.optionImages]; optionImages[optionIndex] = url; patchQuestion(index, { optionImages }); }} onSaved={saveImageImmediately} label={`Tải ảnh đáp án ${optionIndex + 1}`} compact preserveFullImage={exam.level === "topik_ii" && q.section === "reading"} disabled={!editable} />
                  <label className="mt-3 flex cursor-pointer items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-black text-slate-700"><input type="radio" checked={selected} disabled={!editable} onChange={() => patchQuestion(index, { correctOption: optionIndex + 1 })} />Đặt ảnh {optionIndex + 1} làm đáp án đúng</label>
                </> : <label className="flex cursor-pointer items-center gap-3"><input type="radio" checked={selected} disabled={!editable} onChange={() => patchQuestion(index, { correctOption: optionIndex + 1 })} /><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full font-black ${selected ? "bg-emerald-600 text-white" : "bg-white text-slate-800"}`}>{optionIndex + 1}</span><input value={option} disabled={!editable} onChange={(e) => { const options = [...q.options]; options[optionIndex] = e.target.value; patchQuestion(index, { options }); }} className="min-w-0 flex-1 bg-transparent outline-none" placeholder={`Đáp án ${optionIndex + 1}`} />{selected && <span className="text-xs font-black text-emerald-700">Đúng</span>}</label>}
              </div>;
            })}</div>
          </div>
          <label className="mt-4 block font-bold">Giải thích sau khi nộp<textarea value={q.explanation} disabled={!editable} onChange={(e) => patchQuestion(index, { explanation: e.target.value })} className="mt-1 min-h-20 w-full rounded-xl border px-3 py-2.5" /></label>
          {q.section === "listening" && isAudioOwner && <div className="mt-4 rounded-2xl bg-violet-50 p-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><p className="font-black text-violet-800">{isGrouped ? `Audio dùng chung cho câu ${groupLabel}` : `Audio câu ${q.position}`}</p><span className="rounded-full bg-white px-3 py-1 text-xs font-black text-violet-700">Chỉ tạo hoặc tải 1 lần</span></div><label className="font-bold">Nội dung Azure đọc <span className="text-xs text-slate-500">(không bắt buộc)</span><textarea value={q.audioText} disabled={!editable} onChange={(e) => patchAudioBlock(index, { audioText: e.target.value, audioUrl: q.audioUrl })} className="mt-1 min-h-20 w-full rounded-xl border bg-white px-3 py-2.5" /></label><div className="mt-3 flex flex-wrap items-center gap-2">{editable && <><button type="button" disabled={busyIndex !== null} onClick={() => void createAudio(index)} className="rounded-xl bg-violet-600 px-4 py-2 font-black text-white disabled:opacity-50">{busyIndex === index ? "Đang xử lý..." : "Tạo audio Azure"}</button><label className="cursor-pointer rounded-xl border border-violet-200 bg-white px-4 py-2 font-black text-violet-700">Tải audio<input type="file" accept="audio/mpeg,audio/mp4,audio/wav" onChange={(e) => void uploadAudio(index, e)} className="sr-only" /></label></>}{q.audioUrl ? <audio controls preload="none" src={q.audioUrl} className="h-10 max-w-full" /> : <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">Chưa có audio</span>}</div></div>}
          {q.section === "listening" && isGrouped && !isAudioOwner && <div className="mt-4 rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm font-bold text-violet-700">Câu này dùng chung audio của nhóm câu {groupLabel}. Bạn chỉ cần quản lý audio ở câu {groupStart}.</div>}
        </article>;
        })}</div>
        {!visibleQuestions.length && <p className="mt-5 rounded-2xl border-2 border-dashed border-cyan-200 bg-white p-8 text-center font-bold text-slate-500">Chưa có câu {activeSection === "listening" ? "nghe" : "đọc"}. Thêm thủ công hoặc nhập Excel/CSV.</p>}
      </section>
      {editable && <div className="sticky bottom-4 rounded-2xl border bg-white/95 p-4 shadow-xl backdrop-blur"><div className="flex items-center justify-between gap-4"><p aria-live="polite" className={`font-bold ${state.ok ? "text-emerald-700" : "text-red-700"}`}>{state.message || `${questions.length} câu · ${ready ? "đủ điều kiện gửi duyệt" : eligibility.issues[0] ?? "còn thiếu đáp án"}`}</p><button disabled={pending} className="rounded-xl bg-[#10243e] px-5 py-3 font-black text-white disabled:opacity-50">{pending ? "Đang lưu..." : hotfix ? "Áp dụng hotfix" : reviewEdit ? "Lưu chỉnh sửa nhanh" : "Lưu bản nháp"}</button></div></div>}
      {editable && activeSection === "reading" && <aside aria-label="Ký tự đề TOPIK" className="fixed right-4 top-1/2 z-40 w-[116px] -translate-y-1/2 rounded-2xl border border-cyan-200 bg-white/95 p-3 shadow-xl backdrop-blur">
        <p className="text-center text-xs font-black uppercase tracking-wide text-cyan-800">Ký tự đề</p>
        <p className="mt-1 text-center text-[10px] font-semibold leading-4 text-slate-500">Đặt con trỏ rồi bấm</p>
        <div className="mt-3 grid grid-cols-2 gap-2">{["①", "②", "③", "④", "㉠", "㉡", "㉢", "㉣"].map((character) => <button key={character} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => insertExamCharacter(character)} className="grid h-10 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-xl font-bold text-slate-900 transition hover:border-cyan-500 hover:bg-cyan-50 active:scale-95" title={`Chèn ký tự ${character}`}>{character}</button>)}</div>
      </aside>}
    </form>
    {history.length > 0 && <details className="mt-7 rounded-3xl border bg-white p-5"><summary className="cursor-pointer font-black">Lịch sử chỉnh sửa · {history.length} phiên bản</summary><ol className="mt-4 divide-y">{history.map((item) => <li key={item.id} className="flex justify-between gap-4 py-3 text-sm"><span className="font-bold">Phiên bản {item.version} · {item.status}</span><time className="text-slate-500">{new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(item.created_at))}</time></li>)}</ol></details>}
  </main>;
}
