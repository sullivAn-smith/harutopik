"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ExamSection } from "@/lib/exams/types";
import { ExamHighlightListPicker } from "./exam-highlight-list-picker";

type Question = {
  id: string;
  position: number;
  section: ExamSection;
  instruction: string;
  audioBlockKey: string;
  answerType: "text" | "image";
  prompt: string;
  audioUrl: string;
  imageUrl: string;
  options: string[];
  optionImages: string[];
};

type HighlightColor = "yellow" | "blue" | "pink";

type PendingHighlight = {
  questionId: string;
  section: ExamSection;
  sourceField: "instruction" | "prompt" | "option";
  sourceIndex: number | null;
  selectedText: string;
  prefixText: string;
  suffixText: string;
  top: number;
  left: number;
  savedId?: string;
  optimisticId?: string;
  color?: HighlightColor;
  saving?: boolean;
};

export type ExamHighlight = {
  id: string;
  questionId: string;
  sourceField: "instruction" | "prompt" | "option";
  sourceIndex: number | null;
  selectedText: string;
  prefixText: string;
  suffixText: string;
  color: HighlightColor;
  reviewListId?: string | null;
};

function audioKey(question: Question) {
  return question.audioBlockKey || question.id;
}

function colorClass(color: HighlightColor) {
  if (color === "blue") return "bg-cyan-200";
  if (color === "pink") return "bg-pink-200";
  return "bg-yellow-200";
}

function HighlightedText({ text, highlights, onHighlightClick }: {
  text: string;
  highlights: ExamHighlight[];
  onHighlightClick: (highlight: ExamHighlight, element: HTMLElement) => void;
}) {
  const ranges = highlights
    .map((highlight) => {
      const candidates: number[] = [];
      let cursor = text.indexOf(highlight.selectedText);
      while (cursor >= 0) {
        candidates.push(cursor);
        cursor = text.indexOf(highlight.selectedText, cursor + 1);
      }
      const start = candidates.find((candidate) => {
        const prefixMatches = !highlight.prefixText
          || text.slice(Math.max(0, candidate - highlight.prefixText.length), candidate).endsWith(highlight.prefixText);
        const suffixStart = candidate + highlight.selectedText.length;
        const suffixMatches = !highlight.suffixText
          || text.slice(suffixStart, suffixStart + highlight.suffixText.length).startsWith(highlight.suffixText);
        return prefixMatches && suffixMatches;
      }) ?? candidates[0] ?? -1;
      return { ...highlight, start, end: start + highlight.selectedText.length };
    })
    .filter((highlight) => highlight.start >= 0)
    .sort((left, right) => left.start - right.start)
    .filter((highlight, index, all) => index === 0 || highlight.start >= all[index - 1].end);

  if (ranges.length === 0) return text;
  const output: ReactNode[] = [];
  let cursor = 0;
  for (const highlight of ranges) {
    if (highlight.start > cursor) output.push(text.slice(cursor, highlight.start));
    output.push(
      <mark
        key={highlight.id}
        role="button"
        tabIndex={0}
        title="Bấm để quản lý highlight"
        onClick={(event) => {
          event.stopPropagation();
          onHighlightClick(highlight, event.currentTarget);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          event.stopPropagation();
          onHighlightClick(highlight, event.currentTarget);
        }}
        className={`${colorClass(highlight.color)} cursor-pointer rounded px-0.5 outline-none ring-[#087eba] transition hover:ring-2 focus:ring-2`}
      >
        {text.slice(highlight.start, highlight.end)}
      </mark>,
    );
    cursor = highlight.end;
  }
  if (cursor < text.length) output.push(text.slice(cursor));
  return output;
}

export function ExamRunner({
  attemptId,
  examId,
  title,
  section: initialSection,
  expiresAt,
  initialPosition,
  initialAnswers,
  initialFlagged,
  initialAudioPlays,
  initialWindowLeaveCount,
  initialHighlights = [],
  questions,
}: {
  attemptId: string;
  examId: string;
  title: string;
  section: ExamSection;
  expiresAt: string;
  initialPosition: number;
  initialAnswers: Record<string, number>;
  initialFlagged: string[];
  initialAudioPlays: Record<string, number>;
  initialWindowLeaveCount: number;
  initialHighlights?: ExamHighlight[];
  questions: Question[];
}) {
  const router = useRouter();
  const availableSections = useMemo(
    () => (["listening", "reading"] as const).filter((candidate) => questions.some((question) => question.section === candidate)),
    [questions],
  );
  const [activeSection, setActiveSection] = useState<ExamSection>(initialSection);
  const sectionQuestions = useMemo(
    () => questions.filter((question) => question.section === activeSection).sort((left, right) => left.position - right.position),
    [activeSection, questions],
  );
  const initialQuestion = sectionQuestions.find((question) => question.position === initialPosition) ?? sectionQuestions[0];
  const [activeQuestionId, setActiveQuestionId] = useState(initialQuestion?.id ?? "");
  const [answers, setAnswers] = useState(initialAnswers);
  const [flagged, setFlagged] = useState(initialFlagged);
  const [audioPlays, setAudioPlays] = useState(initialAudioPlays);
  const [finishedAudioKeys, setFinishedAudioKeys] = useState<Set<string>>(
    () => new Set(Object.entries(initialAudioPlays).filter(([, count]) => count > 0).map(([key]) => key)),
  );
  const [audioPlayingKey, setAudioPlayingKey] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.floor((Date.parse(expiresAt) - Date.now()) / 1000)));
  const [saving, setSaving] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [windowLeaveCount, setWindowLeaveCount] = useState(initialWindowLeaveCount);
  const [warning, setWarning] = useState(false);
  const [highlights, setHighlights] = useState(initialHighlights);
  const [pendingHighlight, setPendingHighlight] = useState<PendingHighlight | null>(null);
  const [reviewTarget, setReviewTarget] = useState<{ id: string; text: string } | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const selectionJustMadeRef = useRef(false);
  const optimisticSequenceRef = useRef(0);
  const lastWindowEvent = useRef(0);
  const wasFullscreen = useRef(false);

  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    const response = await fetch(`/api/v1/exam-attempts/${attemptId}/submit`, { method: "POST" });
    if (response.ok) router.replace(`/luyen-de/${examId}/ket-qua?attempt=${attemptId}`);
    else {
      const body = await response.json().catch(() => null);
      setSaving(body?.error?.message ?? "Nộp bài thất bại. Hãy kiểm tra mạng và thử lại.");
      setSubmitting(false);
    }
  }

  async function switchSection(nextSection: ExamSection) {
    if (nextSection === activeSection) {
      document.getElementById(`exam-${nextSection}-top`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const previousSection = activeSection;
    const firstQuestion = questions
      .filter((question) => question.section === nextSection)
      .sort((left, right) => left.position - right.position)[0];
    setActiveSection(nextSection);
    setActiveQuestionId(firstQuestion?.id ?? "");
    setPendingHighlight(null);
    setSaving(`Đang mở phần ${nextSection === "listening" ? "Nghe" : "Đọc"}...`);
    const response = await fetch(`/api/v1/exam-attempts/${attemptId}/section`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ section: nextSection }),
    });
    if (!response.ok) {
      setActiveSection(previousSection);
      setSaving("Chưa thể chuyển phần. Hãy thử lại.");
      return;
    }
    setSaving("");
    window.requestAnimationFrame(() => {
      document.getElementById(`exam-${nextSection}-top`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  useEffect(() => {
    const timer = window.setInterval(() => {
      const value = Math.max(0, Math.floor((Date.parse(expiresAt) - Date.now()) / 1000));
      setRemaining(value);
      if (value === 0) {
        window.clearInterval(timer);
        void submit();
      }
    }, 1000);
    return () => window.clearInterval(timer);
    // The absolute attempt expiry owns auto-submit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt]);

  useEffect(() => {
    async function record(eventType: "hidden" | "blur" | "fullscreen_exit") {
      const now = Date.now();
      if (now - lastWindowEvent.current < 2000) return;
      lastWindowEvent.current = now;
      const response = await fetch(`/api/v1/exam-attempts/${attemptId}/window-event`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ section: activeSection, eventType }),
        keepalive: true,
      });
      if (response.ok) {
        const body = await response.json();
        setWindowLeaveCount(Number(body.data?.count ?? windowLeaveCount + 1));
      } else setWindowLeaveCount((count) => count + 1);
      setWarning(true);
    }
    const visibility = () => { if (document.visibilityState === "hidden") void record("hidden"); };
    const blur = () => void record("blur");
    const fullscreen = () => {
      if (document.fullscreenElement) wasFullscreen.current = true;
      else if (wasFullscreen.current) void record("fullscreen_exit");
    };
    document.addEventListener("visibilitychange", visibility);
    document.addEventListener("fullscreenchange", fullscreen);
    window.addEventListener("blur", blur);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      document.removeEventListener("fullscreenchange", fullscreen);
      window.removeEventListener("blur", blur);
    };
  }, [activeSection, attemptId, windowLeaveCount]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top)[0];
      if (visible?.target instanceof HTMLElement) setActiveQuestionId(visible.target.dataset.questionId ?? "");
    }, { rootMargin: "-20% 0px -65% 0px", threshold: 0 });
    for (const question of sectionQuestions) {
      const element = document.getElementById(`question-${question.id}`);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [sectionQuestions]);

  async function choose(question: Question, option: number) {
    const previous = answers[question.id];
    setAnswers((currentAnswers) => ({ ...currentAnswers, [question.id]: option }));
    setSaving(`Đang lưu câu ${question.position}...`);
    const response = await fetch(`/api/v1/exam-attempts/${attemptId}/answer`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ questionId: question.id, option, currentPosition: question.position, flagged }),
    });
    if (response.ok) {
      setSaving(`Đã lưu câu ${question.position}.`);
      return;
    }
    setAnswers((currentAnswers) => {
      const next = { ...currentAnswers };
      if (previous) next[question.id] = previous;
      else delete next[question.id];
      return next;
    });
    const body = await response.json().catch(() => null);
    setSaving(body?.error?.message ?? `Chưa lưu được câu ${question.position}.`);
  }

  function toggleFlag(question: Question) {
    const next = flagged.includes(question.id)
      ? flagged.filter((id) => id !== question.id)
      : [...flagged, question.id];
    setFlagged(next);
    void fetch(`/api/v1/exam-attempts/${attemptId}/answer`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ questionId: question.id, option: answers[question.id] ?? null, currentPosition: question.position, flagged: next }),
    });
  }

  async function playAudio(question: Question) {
    const playKey = audioKey(question);
    if (!question.audioUrl || audioPlayingKey || (audioPlays[playKey] ?? 0) >= 1) return;
    setSaving(`Đang chuẩn bị audio câu ${question.position}...`);
    const response = await fetch(`/api/v1/exam-attempts/${attemptId}/audio`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ questionId: question.id }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setSaving(body?.error?.message ?? "Không thể bắt đầu audio. Hãy tải lại trang.");
      return;
    }
    setAudioPlays((current) => ({ ...current, [playKey]: 1 }));
    setAudioPlayingKey(playKey);
    setSaving("Audio đang phát — bạn vẫn có thể đọc và highlight nội dung.");
    try {
      const audio = audioRef.current;
      if (!audio) throw new Error("AUDIO_NOT_READY");
      audio.src = question.audioUrl;
      audio.currentTime = 0;
      await audio.play();
    } catch {
      setAudioPlayingKey(null);
      setFinishedAudioKeys((current) => new Set(current).add(playKey));
      setSaving("Trình duyệt không phát được audio; câu hỏi đã được mở để tránh mất lượt nghe.");
    }
  }

  function prepareHighlight(
    question: Question,
    root: HTMLElement,
    sourceField: "instruction" | "prompt" | "option",
    sourceText: string,
    sourceIndex: number | null = null,
  ) {
    if (highlights.length >= 50) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (!root.contains(range.commonAncestorContainer)) return;
    const rawSelectedText = range.toString();
    const leadingWhitespace = rawSelectedText.length - rawSelectedText.trimStart().length;
    const selectedText = rawSelectedText.trim();
    if (!selectedText || selectedText.length > 120) return;
    const beforeSelection = range.cloneRange();
    beforeSelection.selectNodeContents(root);
    beforeSelection.setEnd(range.startContainer, range.startOffset);
    const start = Math.min(sourceText.length, beforeSelection.toString().length + leadingWhitespace);
    const rect = range.getBoundingClientRect();
    setPendingHighlight({
      questionId: question.id,
      section: question.section,
      sourceField,
      sourceIndex,
      selectedText,
      prefixText: sourceText.slice(Math.max(0, start - 30), start),
      suffixText: sourceText.slice(start + selectedText.length, start + selectedText.length + 30),
      top: Math.max(12, rect.top - 58),
      left: Math.max(12, Math.min(window.innerWidth - 300, rect.left)),
    });
    selectionJustMadeRef.current = sourceField === "option";
  }

  async function commitHighlight(color: HighlightColor) {
    if (!pendingHighlight || highlights.length >= 50) return null;
    if (pendingHighlight.savedId) return { id: pendingHighlight.savedId, text: pendingHighlight.selectedText };
    if (pendingHighlight.saving) return null;
    optimisticSequenceRef.current += 1;
    const optimisticId = pendingHighlight.optimisticId ?? `pending-${optimisticSequenceRef.current}`;
    const optimisticHighlight: ExamHighlight = {
      id: optimisticId,
      questionId: pendingHighlight.questionId,
      sourceField: pendingHighlight.sourceField,
      sourceIndex: pendingHighlight.sourceIndex,
      selectedText: pendingHighlight.selectedText,
      prefixText: pendingHighlight.prefixText,
      suffixText: pendingHighlight.suffixText,
      color,
      reviewListId: null,
    };
    setHighlights((current) => current.some((highlight) => highlight.id === optimisticId)
      ? current.map((highlight) => highlight.id === optimisticId ? optimisticHighlight : highlight)
      : [...current, optimisticHighlight]);
    setPendingHighlight((current) => current ? { ...current, optimisticId, color, saving: true } : null);
    setSaving(`Đang lưu highlight “${pendingHighlight.selectedText}”...`);
    window.getSelection()?.removeAllRanges();
    const response = await fetch(`/api/v1/exam-attempts/${attemptId}/highlights`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        questionId: pendingHighlight.questionId,
        section: pendingHighlight.section,
        sourceField: pendingHighlight.sourceField,
        sourceIndex: pendingHighlight.sourceIndex,
        selectedText: pendingHighlight.selectedText,
        prefixText: pendingHighlight.prefixText,
        suffixText: pendingHighlight.suffixText,
        color,
      }),
    });
    const body = await response.json().catch(() => null);
    if (response.ok && body?.data?.id) {
      const savedHighlight = { ...optimisticHighlight, id: String(body.data.id) };
      setHighlights((current) => current.map((highlight) => highlight.id === optimisticId ? savedHighlight : highlight));
      setSaving(`Đã lưu “${pendingHighlight.selectedText}” vào highlight.`);
      setPendingHighlight((current) => current ? { ...current, savedId: savedHighlight.id, optimisticId: undefined, color, saving: false } : null);
      selectionJustMadeRef.current = false;
      return { id: savedHighlight.id, text: savedHighlight.selectedText };
    }
    setPendingHighlight((current) => current ? { ...current, optimisticId, color, saving: false } : null);
    const reason = body?.error?.message ? ` ${body.error.message}` : "";
    setSaving(`Màu đã hiển thị nhưng chưa đồng bộ. Bấm lại màu hoặc dấu + để thử lưu.${reason}`);
    return null;
  }

  async function openReviewPicker() {
    const target = pendingHighlight?.savedId
      ? { id: pendingHighlight.savedId, text: pendingHighlight.selectedText }
      : await commitHighlight("yellow");
    if (target) setReviewTarget(target);
  }

  function openSavedHighlight(highlight: ExamHighlight, element: HTMLElement) {
    const rect = element.getBoundingClientRect();
    const question = questions.find((item) => item.id === highlight.questionId);
    window.getSelection()?.removeAllRanges();
    setPendingHighlight({
      questionId: highlight.questionId,
      section: question?.section ?? activeSection,
      sourceField: highlight.sourceField,
      sourceIndex: highlight.sourceIndex,
      selectedText: highlight.selectedText,
      prefixText: highlight.prefixText,
      suffixText: highlight.suffixText,
      top: Math.max(12, rect.top - 58),
      left: Math.max(12, Math.min(window.innerWidth - 300, rect.left)),
      savedId: highlight.id,
      color: highlight.color,
    });
  }

  async function deleteHighlight() {
    if (!pendingHighlight || pendingHighlight.saving) return;
    const targetId = pendingHighlight.savedId ?? pendingHighlight.optimisticId;
    if (!targetId) return;
    const removed = highlights.find((highlight) => highlight.id === targetId);
    setHighlights((current) => current.filter((highlight) => highlight.id !== targetId));
    setPendingHighlight(null);
    selectionJustMadeRef.current = false;
    window.getSelection()?.removeAllRanges();
    if (!pendingHighlight.savedId) {
      setSaving("Đã bỏ highlight chưa đồng bộ.");
      return;
    }
    setSaving(`Đang xóa highlight “${pendingHighlight.selectedText}”...`);
    const response = await fetch(`/api/v1/exam-attempts/${attemptId}/highlights/${pendingHighlight.savedId}`, { method: "DELETE" });
    if (response.ok) {
      setSaving(`Đã xóa highlight “${pendingHighlight.selectedText}”. Từ đã lưu trong bộ từ vẫn được giữ.`);
      return;
    }
    if (removed) setHighlights((current) => [...current, removed]);
    const body = await response.json().catch(() => null);
    setSaving(body?.error?.message ?? "Chưa thể xóa highlight. Hãy thử lại.");
  }

  function jumpToQuestion(question: Question) {
    setActiveQuestionId(question.id);
    document.getElementById(`question-${question.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  const minutes = String(Math.floor(remaining / 60)).padStart(2, "0");
  const seconds = String(remaining % 60).padStart(2, "0");
  const unansweredInSection = sectionQuestions.filter((question) => !answers[question.id]).length;
  const unansweredTotal = questions.filter((question) => !answers[question.id]).length;
  const hasReading = availableSections.includes("reading");
  const modeLabel = availableSections.length === 2
    ? "Thi mô phỏng"
    : availableSections[0] === "reading"
      ? "Luyện Đọc"
      : "Luyện Nghe";

  return (
    <main className="min-h-screen bg-[#eef7fc] text-[#10243e]">
      <audio
        ref={audioRef}
        preload="none"
        onEnded={() => {
          if (audioPlayingKey) setFinishedAudioKeys((current) => new Set(current).add(audioPlayingKey));
          setAudioPlayingKey(null);
          setSaving("Audio đã phát xong. Bạn có thể chọn đáp án.");
        }}
      />

      <header className="sticky top-0 z-30 border-b bg-white/95 px-5 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-cyan-50 ring-1 ring-cyan-100">
              <Image src="/haru-mascot-clean.png" alt="Chim cánh cụt Haru" width={44} height={44} className="h-11 w-11 object-contain" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-[#087eba]">TOPIK I · {modeLabel}</p>
              <h1 className="font-black">{title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full bg-sky-100 px-4 py-2 text-xs font-black text-sky-800 sm:inline">Đã làm {questions.length - unansweredTotal}/{questions.length}</span>
            <div className={`rounded-2xl px-5 py-3 text-xl font-black ${remaining < 300 ? "bg-red-100 text-red-700" : "bg-sky-100 text-[#087eba]"}`}>{minutes}:{seconds}</div>
          </div>
        </div>
      </header>

      {warning && <div role="alert" className="sticky top-[76px] z-20 bg-red-600 px-5 py-3 text-center font-black text-white">Cảnh báo: bạn đã rời cửa sổ thi {windowLeaveCount} lần. <button type="button" className="ml-3 underline" onClick={() => setWarning(false)}>Đã hiểu</button></div>}

      <div id={`exam-${activeSection}-top`} className="scroll-mt-24" />
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 pt-6">
        <nav aria-label="Phần thi" className="inline-flex rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-slate-200">
          {availableSections.map((candidate) => (
            <button type="button" key={candidate} onClick={() => void switchSection(candidate)} className={`rounded-xl px-7 py-3 font-black transition ${activeSection === candidate ? "bg-[#087eba] text-white shadow-sm" : "text-slate-500 hover:bg-sky-50 hover:text-[#087eba]"}`}>
              {candidate === "listening" ? "Listening" : "Reading"}
            </button>
          ))}
        </nav>
        <p className="text-sm font-bold text-slate-500">Cuộn để làm liên tục{availableSections.length === 2 ? " · Chuyển phần bất cứ lúc nào" : " · Chỉ hiển thị phần đã chọn"}</p>
      </div>

      {pendingHighlight && <div role="toolbar" aria-label="Chọn màu highlight" style={{ top: pendingHighlight.top, left: pendingHighlight.left }} className="fixed z-50 flex items-center gap-2 rounded-2xl bg-[#10243e] p-2.5 text-white shadow-2xl ring-1 ring-white/20">
        <span className="pl-1 text-xs font-black">Tô màu</span>
        {(["blue", "pink", "yellow"] as const).map((color) => <button key={color} type="button" disabled={Boolean(pendingHighlight.savedId || pendingHighlight.saving)} aria-label={`Highlight màu ${color === "blue" ? "xanh" : color === "pink" ? "hồng" : "vàng"}`} onClick={() => void commitHighlight(color)} className={`h-8 w-8 rounded-lg ${colorClass(color)} ring-2 transition hover:scale-110 disabled:cursor-default disabled:hover:scale-100 ${pendingHighlight.color === color ? "ring-white" : "ring-white/50"}`} />)}
        <button type="button" disabled={Boolean(pendingHighlight.saving)} aria-label="Lưu vào bộ từ ôn tập" title="Lưu vào bộ từ để ôn sau" onClick={() => void openReviewPicker()} className="grid h-8 w-8 place-items-center rounded-lg bg-white/15 text-xl font-black transition hover:bg-emerald-500 disabled:opacity-50">+</button>
        {(pendingHighlight.savedId || pendingHighlight.optimisticId) && <button type="button" disabled={Boolean(pendingHighlight.saving)} aria-label="Xóa highlight" title="Bỏ phần tô màu này" onClick={() => void deleteHighlight()} className="grid h-8 w-8 place-items-center rounded-lg bg-red-500/20 text-base transition hover:bg-red-500 disabled:opacity-50">⌫</button>}
        <button type="button" aria-label="Đóng thanh highlight" onClick={() => { window.getSelection()?.removeAllRanges(); setPendingHighlight(null); selectionJustMadeRef.current = false; }} className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 font-black hover:bg-white/20">×</button>
      </div>}

      {reviewTarget && <ExamHighlightListPicker attemptId={attemptId} highlightId={reviewTarget.id} text={reviewTarget.text} onClose={() => setReviewTarget(null)} onSaved={(listId, listName) => {
        setHighlights((current) => current.map((highlight) => highlight.id === reviewTarget.id ? { ...highlight, reviewListId: listId } : highlight));
        setSaving(`Đã lưu “${reviewTarget.text}” vào “${listName}”.`);
        setReviewTarget(null);
        setPendingHighlight(null);
      }} />}

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-7 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="overflow-hidden rounded-3xl bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5 md:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="text-xs font-black uppercase tracking-[0.2em] text-[#087eba]">Phần {activeSection === "listening" ? "Nghe" : "Đọc"}</p><h2 className="mt-1 text-2xl font-black">{sectionQuestions.length} câu hỏi</h2></div>
              <span className="rounded-full bg-yellow-50 px-4 py-2 text-sm font-black text-yellow-800 ring-1 ring-yellow-200">✦ Bôi đen để highlight · {highlights.length}/50</span>
            </div>
          </div>

          <div className="divide-y divide-slate-200">
            {sectionQuestions.map((question) => {
              const questionHighlights = highlights.filter((highlight) => highlight.questionId === question.id);
              const playKey = audioKey(question);
              const audioReady = !question.audioUrl || finishedAudioKeys.has(playKey);
              return <article key={question.id} id={`question-${question.id}`} data-question-id={question.id} className="scroll-mt-32 px-6 py-8 md:px-8 md:py-10">
                <div className="flex gap-4">
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-lg font-black ${answers[question.id] ? "bg-[#087eba] text-white" : "bg-sky-100 text-[#087eba]"}`}>{question.position}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div onMouseUp={(event) => prepareHighlight(question, event.currentTarget, "instruction", question.instruction)} className="min-w-0 flex-1">
                        <h3 className="text-lg font-black"><HighlightedText text={question.instruction} highlights={questionHighlights.filter((highlight) => highlight.sourceField === "instruction")} onHighlightClick={openSavedHighlight} /></h3>
                      </div>
                      <button type="button" onClick={() => toggleFlag(question)} className={`rounded-full px-4 py-2 text-sm font-black ${flagged.includes(question.id) ? "bg-amber-200 text-amber-900" : "bg-slate-100 text-slate-600 hover:bg-amber-50"}`}>⚑ {flagged.includes(question.id) ? "Đã đánh dấu" : "Xem lại"}</button>
                    </div>

                    {question.prompt && <div onMouseUp={(event) => prepareHighlight(question, event.currentTarget, "prompt", question.prompt)}><p className="mt-4 text-lg font-semibold leading-8 text-slate-700"><HighlightedText text={question.prompt} highlights={questionHighlights.filter((highlight) => highlight.sourceField === "prompt")} onHighlightClick={openSavedHighlight} /></p></div>}
                    {question.imageUrl && <Image unoptimized width={800} height={500} src={question.imageUrl} alt={`Minh họa câu ${question.position}`} className="mt-5 max-h-[430px] w-auto rounded-2xl object-contain" />}

                    {activeSection === "listening" && (question.audioUrl
                      ? <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl bg-cyan-50 p-4"><button type="button" onClick={() => void playAudio(question)} disabled={Boolean(audioPlayingKey) || (audioPlays[playKey] ?? 0) >= 1} className="rounded-xl bg-[#087eba] px-5 py-3 font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300">{audioPlayingKey === playKey ? "Đang phát audio…" : (audioPlays[playKey] ?? 0) >= 1 ? "Đã nghe audio" : "▶ Bắt đầu nghe"}</button><p className="text-sm font-bold text-slate-500">Audio chỉ phát một lần.</p></div>
                      : <p className="mt-5 rounded-2xl bg-slate-100 p-4 font-bold text-slate-600">Câu này không có audio.</p>)}

                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      {question.options.map((option, index) => <button
                        type="button"
                        key={index}
                        aria-label={`Đáp án ${index + 1}: ${option}`}
                        disabled={activeSection === "listening" && !audioReady}
                        onClick={() => {
                          if (selectionJustMadeRef.current) { selectionJustMadeRef.current = false; return; }
                          void choose(question, index + 1);
                        }}
                        className={`flex min-h-16 items-center gap-3 rounded-2xl border-2 p-4 text-left font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${answers[question.id] === index + 1 ? "border-[#087eba] bg-sky-100 text-[#075f88]" : "border-slate-200 hover:border-sky-300"}`}
                      >
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white">{index + 1}</span>
                        {question.answerType === "image" && question.optionImages[index]
                          ? <Image unoptimized src={question.optionImages[index]} alt={`Lựa chọn ${index + 1}`} width={240} height={160} className="max-h-40 min-w-0 flex-1 rounded-xl object-contain" />
                          : <span onMouseUp={(event) => prepareHighlight(question, event.currentTarget, "option", option, index)}><HighlightedText text={option} highlights={questionHighlights.filter((highlight) => highlight.sourceField === "option" && highlight.sourceIndex === index)} onHighlightClick={openSavedHighlight} /></span>}
                      </button>)}
                    </div>
                  </div>
                </div>
              </article>;
            })}
          </div>

          <div className="border-t border-slate-200 bg-slate-50 px-6 py-7 text-center md:px-8">
            {activeSection === "listening" && hasReading
              ? <button type="button" onClick={() => void switchSection("reading")} className="rounded-2xl bg-[#087eba] px-7 py-4 font-black text-white shadow-sm transition hover:bg-[#066c9f]">Sang phần Đọc →</button>
              : <button type="button" disabled={submitting} onClick={() => { if (window.confirm(`Nộp bài ngay? Bạn còn ${unansweredTotal} câu chưa trả lời.`)) void submit(); }} className="rounded-2xl bg-emerald-600 px-8 py-4 font-black text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50">{submitting ? "Đang nộp..." : "Nộp bài"}</button>}
          </div>
        </section>

        <aside className="h-fit rounded-3xl bg-white p-5 shadow-sm lg:sticky lg:top-24">
          <div className="flex items-center justify-between"><h2 className="font-black">Danh sách câu</h2><span className="text-xs font-bold text-slate-500">Còn {unansweredInSection}</span></div>
          <div className="mt-4 grid grid-cols-5 gap-2">
            {sectionQuestions.map((question) => <button type="button" key={question.id} onClick={() => jumpToQuestion(question)} className={`relative aspect-square rounded-xl text-sm font-black transition ${activeQuestionId === question.id ? "ring-2 ring-[#10243e] ring-offset-2" : ""} ${answers[question.id] ? "bg-[#087eba] text-white" : "bg-slate-100 text-slate-500 hover:bg-sky-100"}`}>{question.position}{flagged.includes(question.id) && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-amber-400" />}</button>)}
          </div>
          <div className="mt-5 space-y-2 border-t border-slate-200 pt-4 text-xs font-bold text-slate-500"><p><span className="mr-2 inline-block h-3 w-3 rounded bg-[#087eba]" />Đã trả lời</p><p><span className="mr-2 inline-block h-3 w-3 rounded bg-slate-100 ring-1 ring-slate-200" />Chưa trả lời</p><p><span className="mr-2 inline-block h-3 w-3 rounded-full bg-amber-400" />Đánh dấu xem lại</p></div>
          <p className="mt-5 min-h-5 text-center text-xs font-bold text-slate-500">{saving}</p>
        </aside>
      </div>
    </main>
  );
}
