"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { boxesTopikIIReadingPrimaryPrompt, boxesTopikIIReadingSecondaryPrompt, getTopikIITextAnswerLayout, showsTopikIIReadingImageAbove, showsTopikIIReadingTitleAbove, usesCompactTopikIIReadingImageFrame } from "@/lib/exams/exam-question-layout";
import type { ExamSection } from "@/lib/exams/types";
import { ExamHighlightListPicker } from "./exam-highlight-list-picker";

type Question = {
  id: string;
  position: number;
  section: ExamSection;
  instruction: string;
  audioBlockKey: string;
  readingType?: string;
  passageBlockKey?: string;
  passage?: string;
  answerType: "text" | "image";
  prompt: string;
  underlinedText?: string;
  secondaryPrompt?: string;
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

function formatAudioTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return "00:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function colorClass(color: HighlightColor) {
  if (color === "blue") return "bg-cyan-200";
  if (color === "pink") return "bg-pink-200";
  return "bg-yellow-200";
}

function UnderlinedText({ text, underlinedText, start = 0, end = text.length }: {
  text: string;
  underlinedText?: string;
  start?: number;
  end?: number;
}) {
  const target = underlinedText?.trim() ?? "";
  const underlineStart = target ? text.indexOf(target) : -1;
  const underlineEnd = underlineStart + target.length;
  if (underlineStart < 0 || underlineEnd <= start || underlineStart >= end) return text.slice(start, end);
  const overlapStart = Math.max(start, underlineStart);
  const overlapEnd = Math.min(end, underlineEnd);
  return <>{text.slice(start, overlapStart)}<u className="decoration-2 underline-offset-4">{text.slice(overlapStart, overlapEnd)}</u>{text.slice(overlapEnd, end)}</>;
}

function HighlightedText({ text, underlinedText, highlights, onHighlightClick }: {
  text: string;
  underlinedText?: string;
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

  if (ranges.length === 0) return <UnderlinedText text={text} underlinedText={underlinedText} />;
  const output: ReactNode[] = [];
  let cursor = 0;
  for (const highlight of ranges) {
    if (highlight.start > cursor) output.push(<UnderlinedText key={`plain-${cursor}`} text={text} underlinedText={underlinedText} start={cursor} end={highlight.start} />);
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
        <UnderlinedText text={text} underlinedText={underlinedText} start={highlight.start} end={highlight.end} />
      </mark>,
    );
    cursor = highlight.end;
  }
  if (cursor < text.length) output.push(<UnderlinedText key={`plain-${cursor}`} text={text} underlinedText={underlinedText} start={cursor} />);
  return output;
}

export function ExamRunner({
  attemptId,
  examId,
  title,
  level,
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
  level?: "topik_i" | "topik_ii";
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
  const [finishedAudioKeys, setFinishedAudioKeys] = useState<Set<string>>(
    () => new Set(Object.entries(initialAudioPlays).filter(([, count]) => count > 0).map(([key]) => key)),
  );
  const [activeAudioKey, setActiveAudioKey] = useState<string | null>(null);
  const [audioIsPlaying, setAudioIsPlaying] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
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
  const suppressWindowEvents = useRef(false);
  const progressTimer = useRef<number | undefined>(undefined);
  const lastSavedProgress = useRef(`${initialSection}:${initialPosition}`);

  function persistProgress(question: Question, keepalive = false) {
    const key = `${question.section}:${question.position}`;
    if (lastSavedProgress.current === key) return Promise.resolve();
    lastSavedProgress.current = key;
    return fetch(`/api/v1/exam-attempts/${attemptId}/progress`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ questionId: question.id, section: question.section, position: question.position }),
      keepalive,
    }).then((response) => {
      if (!response.ok) lastSavedProgress.current = "";
    }).catch(() => { lastSavedProgress.current = ""; });
  }

  async function exitExam() {
    suppressWindowEvents.current = true;
    const activeQuestion = questions.find((question) => question.id === activeQuestionId);
    if (activeQuestion) await persistProgress(activeQuestion, true);
    router.push(`/luyen-de/${examId}`);
  }

  async function submit() {
    if (submitting) return;
    suppressWindowEvents.current = true;
    setSubmitting(true);
    const response = await fetch(`/api/v1/exam-attempts/${attemptId}/submit`, { method: "POST" });
    if (response.ok) router.replace(`/luyen-de/${examId}/ket-qua?attempt=${attemptId}`);
    else {
      const body = await response.json().catch(() => null);
      setSaving(body?.error?.message ?? "Nộp bài thất bại. Hãy kiểm tra mạng và thử lại.");
      setSubmitting(false);
      suppressWindowEvents.current = false;
    }
  }

  function confirmSubmit() {
    suppressWindowEvents.current = true;
    if (window.confirm(`Nộp bài ngay? Bạn còn ${questions.filter((question) => !answers[question.id]).length} câu chưa trả lời.`)) {
      void submit();
      return;
    }
    window.setTimeout(() => { suppressWindowEvents.current = false; }, 250);
  }

  async function switchSection(nextSection: ExamSection) {
    if (nextSection === activeSection) {
      document.getElementById(`exam-${nextSection}-top`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const previousSection = activeSection;
    audioRef.current?.pause();
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
      if (suppressWindowEvents.current) return;
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
        setWarning(true);
      }
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
      if (visible?.target instanceof HTMLElement) {
        const questionId = visible.target.dataset.questionId ?? "";
        setActiveQuestionId(questionId);
        const question = questions.find((item) => item.id === questionId);
        if (question) {
          window.clearTimeout(progressTimer.current);
          progressTimer.current = window.setTimeout(() => void persistProgress(question), 500);
        }
      }
    }, { rootMargin: "-20% 0px -65% 0px", threshold: 0 });
    for (const question of sectionQuestions) {
      const element = document.getElementById(`question-${question.id}`);
      if (element) observer.observe(element);
    }
    return () => {
      observer.disconnect();
      window.clearTimeout(progressTimer.current);
    };
    // Persist only when the visible section changes; questions are immutable attempt snapshots.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  async function playAudio(question: Question, restart = false) {
    const playKey = audioKey(question);
    if (!question.audioUrl) return;
    try {
      const audio = audioRef.current;
      if (!audio) throw new Error("AUDIO_NOT_READY");
      if (activeAudioKey !== playKey) {
        audio.pause();
        audio.src = question.audioUrl;
        audio.load();
        setActiveAudioKey(playKey);
        setAudioCurrentTime(0);
        setAudioDuration(0);
      } else if (restart || audio.ended) {
        audio.currentTime = 0;
        setAudioCurrentTime(0);
      }
      await audio.play();
      setSaving("");
    } catch {
      setAudioIsPlaying(false);
      setSaving("Không phát được audio. Hãy kiểm tra kết nối và thử lại.");
    }
  }

  function toggleAudio(question: Question) {
    const playKey = audioKey(question);
    const audio = audioRef.current;
    if (audio && activeAudioKey === playKey && !audio.paused) {
      audio.pause();
      return;
    }
    void playAudio(question);
  }

  function seekAudio(question: Question, nextTime: number) {
    const audio = audioRef.current;
    if (!audio || activeAudioKey !== audioKey(question) || !Number.isFinite(nextTime)) return;
    audio.currentTime = Math.min(Math.max(0, nextTime), audio.duration || nextTime);
    setAudioCurrentTime(audio.currentTime);
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
  const levelLabel = level === "topik_ii"
    ? "TOPIK II"
    : level === "topik_i"
      ? "TOPIK I"
      : questions.length === 50 || questions.length === 100 ? "TOPIK II" : "TOPIK I";
  const readingNumberOffset = activeSection === "reading" && levelLabel === "TOPIK I" ? 30 : 0;
  const shouldShareLearnerFrame = (first?: Question, second?: Question) => Boolean(
    first
    && second
    && second.position === first.position + 1
    && (
      (levelLabel === "TOPIK I"
        && activeSection === "listening"
        && first.position >= 25
        && first.position <= 29
        && first.position % 2 === 1
        && first.audioBlockKey
        && first.audioBlockKey === second.audioBlockKey)
      || (levelLabel === "TOPIK II"
        && activeSection === "listening"
        && first.position >= 21
        && first.position <= 49
        && first.position % 2 === 1
        && first.audioBlockKey
        && first.audioBlockKey === second.audioBlockKey)
      || (levelLabel === "TOPIK I"
        && activeSection === "reading"
        && ((first.position >= 19 && first.position <= 25)
          || (first.position >= 29 && first.position <= 31)
          || (first.position >= 33 && first.position <= 39))
        && first.position % 2 === 1
        && first.passageBlockKey
        && first.passageBlockKey === second.passageBlockKey)
    ),
  );
  const learnerQuestionBlocks: Question[][] = [];
  for (let index = 0; index < sectionQuestions.length; index += 1) {
    const question = sectionQuestions[index];
    const nextQuestion = sectionQuestions[index + 1];
    const keepsSeparateTopikIReading57To58 = levelLabel === "TOPIK I" && question.position >= 27 && question.position <= 28;
    if (activeSection === "reading" && question.passageBlockKey && !keepsSeparateTopikIReading57To58) {
      const sharedQuestions = sectionQuestions.slice(index).filter((candidate, candidateIndex, remaining) =>
        candidate.passageBlockKey === question.passageBlockKey
        && candidate.position === question.position + candidateIndex
        && (candidateIndex === 0 || remaining[candidateIndex - 1]?.passageBlockKey === question.passageBlockKey),
      );
      if (sharedQuestions.length > 1) {
        learnerQuestionBlocks.push(sharedQuestions);
        index += sharedQuestions.length - 1;
        continue;
      }
    }
    if (shouldShareLearnerFrame(question, nextQuestion)) {
      learnerQuestionBlocks.push([question, nextQuestion]);
      index += 1;
    } else {
      learnerQuestionBlocks.push([question]);
    }
  }

  return (
    <main className="min-h-screen bg-[#eef7fc] text-[#10243e]">
      <audio
        ref={audioRef}
        preload="metadata"
        onLoadedMetadata={(event) => {
          setAudioDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0);
          setAudioCurrentTime(event.currentTarget.currentTime);
        }}
        onDurationChange={(event) => {
          setAudioDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0);
        }}
        onTimeUpdate={(event) => setAudioCurrentTime(event.currentTarget.currentTime)}
        onPlay={() => setAudioIsPlaying(true)}
        onPause={() => setAudioIsPlaying(false)}
        onEnded={() => {
          if (activeAudioKey) setFinishedAudioKeys((current) => new Set(current).add(activeAudioKey));
          setAudioIsPlaying(false);
          setSaving("");
        }}
        onError={() => {
          setAudioIsPlaying(false);
          setSaving("Không tải được audio. Hãy kiểm tra kết nối và thử lại.");
        }}
      />

      <header className="sticky top-0 z-30 border-b bg-white/95 px-5 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-cyan-50 ring-1 ring-cyan-100">
              <Image src="/haru-mascot-clean.png" alt="Chim cánh cụt Haru" width={44} height={44} className="h-11 w-11 object-contain" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-[#087eba]">{levelLabel} · {modeLabel}</p>
              <h1 className="font-black">{title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => void exitExam()} className="inline-flex rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition hover:border-sky-300 hover:text-[#087eba] sm:px-4 sm:text-sm">Thoát và làm tiếp sau</button>
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
            {learnerQuestionBlocks.map((questionBlock) => {
              const renderedQuestions = questionBlock.map((question) => {
              const questionIndex = sectionQuestions.indexOf(question);
              const questionHighlights = highlights.filter((highlight) => highlight.questionId === question.id);
              const playKey = audioKey(question);
              const isActiveAudio = activeAudioKey === playKey;
              const displayedCurrentTime = isActiveAudio ? audioCurrentTime : 0;
              const displayedDuration = isActiveAudio ? audioDuration : 0;
              const previousQuestion = sectionQuestions[questionIndex - 1];
              const displayPosition = question.position + readingNumberOffset;
              const sharedAudioQuestions = activeSection === "listening" && question.audioBlockKey
                ? sectionQuestions.filter((item) => item.audioBlockKey === question.audioBlockKey)
                : [];
              const sharedAudioRange = sharedAudioQuestions.length > 1
                ? `${sharedAudioQuestions[0].position}~${sharedAudioQuestions[sharedAudioQuestions.length - 1].position}`
                : "";
              const firstOfSharedAudio = Boolean(sharedAudioRange)
                && previousQuestion?.audioBlockKey !== question.audioBlockKey;
              const showListeningAudio = activeSection === "listening"
                && (!sharedAudioRange || firstOfSharedAudio);
              const audioReady = !question.audioUrl
                || finishedAudioKeys.has(playKey)
                || isActiveAudio
                || Boolean(answers[question.id])
                || sharedAudioQuestions.some((item) => Boolean(answers[item.id]));
              const separatesTopikIReading57To58 = levelLabel === "TOPIK I"
                && activeSection === "reading"
                && question.position >= 27
                && question.position <= 28;
              const sharedReadingQuestions = activeSection === "reading" && question.passageBlockKey && !separatesTopikIReading57To58
                ? sectionQuestions.filter((item) => item.passageBlockKey === question.passageBlockKey)
                : [];
              const sharedReadingRange = sharedReadingQuestions.length > 1
                ? `${sharedReadingQuestions[0].position + readingNumberOffset}~${sharedReadingQuestions[sharedReadingQuestions.length - 1].position + readingNumberOffset}`
                : "";
              const firstOfSharedReading = Boolean(sharedReadingRange)
                && previousQuestion?.passageBlockKey !== question.passageBlockKey;
              const isTopikIBoxedReading = levelLabel === "TOPIK I"
                && activeSection === "reading"
                && ((question.position >= 1 && question.position <= 9)
                  || (question.position >= 13 && question.position <= 18));
              const isTopikIHorizontalBoxedReading = levelLabel === "TOPIK I"
                && activeSection === "reading"
                && question.position >= 1
                && question.position <= 9;
              const isTopikILargeImageReading = levelLabel === "TOPIK I"
                && activeSection === "reading"
                && ((question.position >= 10 && question.position <= 12)
                  || (question.position >= 33 && question.position <= 34));
              const isTopikISharedReadingPair = levelLabel === "TOPIK I"
                && activeSection === "reading"
                && ((question.position >= 19 && question.position <= 26)
                  || (question.position >= 33 && question.position <= 40));
              const isTopikIReadingQuestion59 = levelLabel === "TOPIK I"
                && activeSection === "reading"
                && question.position === 29;
              const isTopikIVerticalSharedReadingAnswer = levelLabel === "TOPIK I"
                && activeSection === "reading"
                && [20, 24, 26, 32, 33, 34, 35, 36, 40].includes(question.position);
              const isTopikIVerticalListeningAnswer = levelLabel === "TOPIK I"
                && activeSection === "listening"
                && question.position >= 17
                && question.position <= 30;
              const hidesTopikIReadingPassage = levelLabel === "TOPIK I"
                && activeSection === "reading"
                && question.position >= 1
                && question.position <= 18;
              const showReadingPassage = activeSection === "reading" && Boolean(question.passage)
                && !hidesTopikIReadingPassage
                && (separatesTopikIReading57To58 || !question.passageBlockKey || previousQuestion?.passageBlockKey !== question.passageBlockKey);
              const showSideImage = Boolean(question.imageUrl && question.answerType !== "image")
                && (separatesTopikIReading57To58 || !question.passageBlockKey || previousQuestion?.passageBlockKey !== question.passageBlockKey);
              const topikIIAnswerLayout = getTopikIITextAnswerLayout(level, question.section, question.position);
              const isTopikIIReadingImageAbove = showsTopikIIReadingImageAbove(level, question.section, question.position);
              const usesCompactTopikIIImageFrame = usesCompactTopikIIReadingImageFrame(level, question.section, question.position);
              const isTopikIIReadingTitleAbove = showsTopikIIReadingTitleAbove(level, question.section, question.position);
              const boxesTopikIIPrimaryPrompt = boxesTopikIIReadingPrimaryPrompt(level, question.section, question.position);
              const boxesTopikIISecondaryPrompt = boxesTopikIIReadingSecondaryPrompt(level, question.section, question.position);
              return <article key={question.id} id={`question-${question.id}`} data-question-id={question.id} className="scroll-mt-32 px-6 py-8 md:px-8 md:py-10">
                {firstOfSharedReading && question.instruction && <h3 className="mb-5 rounded-2xl bg-slate-50 px-5 py-4 text-lg font-bold text-slate-900 ring-1 ring-slate-200">[{sharedReadingRange}] {question.instruction}</h3>}
                {firstOfSharedAudio && question.instruction && <h3 className="mb-5 rounded-2xl bg-cyan-50 px-5 py-4 text-lg font-bold text-slate-900 ring-1 ring-cyan-100">[{sharedAudioRange}] {question.instruction}</h3>}
                {separatesTopikIReading57To58 && question.instruction && <h3 onMouseUp={(event) => prepareHighlight(question, event.currentTarget, "instruction", question.instruction)} className="mb-5 text-lg font-bold text-slate-900"><HighlightedText text={question.instruction} highlights={questionHighlights.filter((highlight) => highlight.sourceField === "instruction")} onHighlightClick={openSavedHighlight} /></h3>}
                {isTopikIIReadingTitleAbove && question.instruction && <h3 onMouseUp={(event) => prepareHighlight(question, event.currentTarget, "instruction", question.instruction)} className="mb-5 text-lg font-bold text-slate-900"><HighlightedText text={question.instruction} highlights={questionHighlights.filter((highlight) => highlight.sourceField === "instruction")} onHighlightClick={openSavedHighlight} /></h3>}
                {showReadingPassage && <div className="exam-material-frame mb-7 border-[3px] border-black bg-white p-5 md:p-7">
                  {!isTopikISharedReadingPair && <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-black uppercase tracking-[0.18em] text-[#087eba]">Ngữ liệu đọc</p>{question.passageBlockKey && <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-200">Dùng cho nhiều câu</span>}</div>}
                  {question.passage && <p className="whitespace-pre-wrap text-lg font-normal leading-9 text-slate-800"><UnderlinedText text={question.passage} underlinedText={question.underlinedText} /></p>}
                </div>}
                <div className="flex gap-4">
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-lg font-black ${answers[question.id] ? "bg-[#087eba] text-white" : "bg-sky-100 text-[#087eba]"}`}>{displayPosition}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      {!sharedReadingRange && !sharedAudioRange && !separatesTopikIReading57To58 && !isTopikIIReadingTitleAbove && <div onMouseUp={(event) => prepareHighlight(question, event.currentTarget, "instruction", question.instruction)} className="min-w-0 flex-1">
                        <h3 className="text-lg font-bold"><HighlightedText text={question.instruction} highlights={questionHighlights.filter((highlight) => highlight.sourceField === "instruction")} onHighlightClick={openSavedHighlight} /></h3>
                      </div>}
                      <button type="button" onClick={() => toggleFlag(question)} className={`rounded-full px-4 py-2 text-sm font-black ${flagged.includes(question.id) ? "bg-amber-200 text-amber-900" : "bg-slate-100 text-slate-600 hover:bg-amber-50"}`}>⚑ {flagged.includes(question.id) ? "Đã đánh dấu" : "Xem lại"}</button>
                    </div>

                    {question.prompt && <div onMouseUp={(event) => prepareHighlight(question, event.currentTarget, "prompt", question.prompt)}><p className={isTopikIBoxedReading || boxesTopikIIPrimaryPrompt ? "exam-material-frame mt-4 border-[3px] border-black bg-white px-5 py-4 text-lg font-normal leading-8 text-slate-800" : "mt-4 text-lg font-normal leading-8 text-slate-700"}><HighlightedText text={question.prompt} underlinedText={question.underlinedText} highlights={questionHighlights.filter((highlight) => highlight.sourceField === "prompt")} onHighlightClick={openSavedHighlight} /></p></div>}
                    {question.secondaryPrompt && <div className={isTopikIReadingQuestion59 ? "mt-4 border border-slate-500 bg-white px-5 py-4" : boxesTopikIISecondaryPrompt ? "exam-material-frame mt-4 border-[3px] border-black bg-white px-5 py-4" : "mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4"}>{!isTopikIReadingQuestion59 && <p className="mb-2 text-center text-xs font-black tracking-[0.2em] text-slate-500">＜보기＞</p>}<p className="whitespace-pre-wrap text-lg font-normal leading-8 text-slate-800">{question.secondaryPrompt}</p></div>}

                    {showListeningAudio && (question.audioUrl
                      ? <div className="mt-5 rounded-2xl bg-cyan-50 p-4 ring-1 ring-cyan-100">
                          {sharedAudioRange && <p className="mb-3 text-sm font-black text-[#087eba]">Audio dùng chung cho câu {sharedAudioRange}</p>}
                          <div className="flex flex-wrap items-center gap-3">
                            <button
                              type="button"
                              onClick={() => toggleAudio(question)}
                              aria-label={isActiveAudio && audioIsPlaying ? `Tạm dừng audio câu ${question.position}` : `Phát audio câu ${question.position}`}
                              className="min-w-32 rounded-xl bg-[#087eba] px-5 py-3 font-black text-white shadow-sm transition hover:bg-[#066c9f]"
                            >
                              {isActiveAudio && audioIsPlaying ? "❚❚ Tạm dừng" : "▶ Phát audio"}
                            </button>
                            <div className="flex min-w-56 flex-1 items-center gap-3">
                              <span className="w-12 text-right text-xs font-black tabular-nums text-slate-600">{formatAudioTime(displayedCurrentTime)}</span>
                              <input
                                type="range"
                                min={0}
                                max={displayedDuration || 0}
                                step={0.1}
                                value={Math.min(displayedCurrentTime, displayedDuration || 0)}
                                disabled={!isActiveAudio || displayedDuration <= 0}
                                onChange={(event) => seekAudio(question, Number(event.currentTarget.value))}
                                aria-label={`Tua audio câu ${question.position}`}
                                className="h-2 min-w-28 flex-1 cursor-pointer accent-[#087eba] disabled:cursor-not-allowed disabled:opacity-50"
                              />
                              <span className="w-12 text-xs font-black tabular-nums text-slate-600">{formatAudioTime(displayedDuration)}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => void playAudio(question, true)}
                              className="rounded-xl border border-sky-200 bg-white px-4 py-3 font-black text-[#087eba] transition hover:bg-sky-50"
                            >
                              ↻ Nghe lại
                            </button>
                          </div>
                          <p className="mt-3 text-sm font-bold text-slate-500">Bạn có thể tạm dừng, tua và nghe lại không giới hạn.</p>
                        </div>
                      : <p className="mt-5 rounded-2xl bg-slate-100 p-4 font-bold text-slate-600">Câu này không có audio.</p>)}

                    <div className={`mt-6 ${showSideImage && !isTopikILargeImageReading && !isTopikIIReadingImageAbove ? "grid items-start gap-6 xl:grid-cols-[minmax(220px,0.8fr)_minmax(340px,1.2fr)]" : ""}`}>
                      {showSideImage && (usesCompactTopikIIImageFrame
                        ? <span className="exam-material-frame relative mx-auto block h-40 w-full max-w-[820px] overflow-hidden rounded-xl border-[3px] border-black bg-white sm:h-44"><Image unoptimized width={1200} height={900} src={question.imageUrl} alt={`Ngữ liệu câu ${question.position}`} className="absolute inset-0 h-full w-full object-cover object-center" /></span>
                        : <Image unoptimized width={1200} height={900} src={question.imageUrl} alt={`Ngữ liệu câu ${question.position}`} className={isTopikILargeImageReading || isTopikIIReadingImageAbove ? "exam-material-frame mx-auto h-auto max-h-[760px] w-full max-w-[920px] rounded-xl border-[3px] border-black bg-white object-contain p-3" : "exam-material-frame h-auto max-h-[620px] w-full max-w-[560px] justify-self-center rounded-2xl border-[3px] border-black bg-white object-contain p-2"} />)}
                      <div className={`grid ${question.answerType === "image" ? "mx-auto w-full max-w-[532px] grid-cols-2 gap-2.5" : topikIIAnswerLayout === "vertical" ? "mt-6 grid-cols-1 gap-3" : topikIIAnswerLayout === "two_columns" ? "mt-6 grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2" : topikIIAnswerLayout === "horizontal" ? "mt-6 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" : isTopikILargeImageReading ? "mx-auto mt-6 w-full max-w-[920px] grid-cols-1 gap-3" : showSideImage ? "grid-cols-1 gap-3" : isTopikIVerticalListeningAnswer || isTopikIVerticalSharedReadingAnswer ? "grid-cols-1 gap-3" : isTopikIReadingQuestion59 || isTopikIHorizontalBoxedReading ? "grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" : isTopikIBoxedReading ? "grid-cols-1 gap-3" : "gap-3 sm:grid-cols-2"}`}>
                      {question.options.map((option, index) => question.answerType === "image"
                        ? <button
                            type="button"
                            key={index}
                            aria-label={`Chọn ảnh đáp án ${index + 1}`}
                            disabled={activeSection === "listening" && !audioReady}
                            onClick={() => void choose(question, index + 1)}
                            className={`group relative aspect-[4/3] overflow-hidden border bg-slate-50 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${answers[question.id] === index + 1 ? "border-[3px] border-[#10243e] ring-2 ring-sky-300" : "border-slate-200 hover:border-cyan-600"}`}
                          >
                            {question.optionImages[index] && <Image unoptimized src={question.optionImages[index]} alt={`Đáp án ${index + 1}`} fill sizes="(max-width: 640px) 45vw, 260px" className="bg-white object-contain p-1" />}
                            <span className="absolute left-2 top-2 grid h-7 w-7 place-items-center rounded-full border border-slate-300 bg-white/95 text-sm font-black text-slate-800 shadow-sm">{index + 1}</span>
                          </button>
                        : <button
                            type="button"
                            key={index}
                            aria-label={`Đáp án ${index + 1}: ${option}`}
                            disabled={activeSection === "listening" && !audioReady}
                            onClick={() => {
                              if (selectionJustMadeRef.current) { selectionJustMadeRef.current = false; return; }
                              void choose(question, index + 1);
                            }}
                            className={`flex min-h-16 items-center gap-3 rounded-2xl border-2 p-4 text-left text-lg font-normal transition disabled:cursor-not-allowed disabled:opacity-50 ${answers[question.id] === index + 1 ? "border-[#087eba] bg-sky-100 text-[#075f88]" : "border-slate-200 hover:border-sky-300"}`}
                          >
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white">{index + 1}</span>
                            <span onMouseUp={(event) => prepareHighlight(question, event.currentTarget, "option", option, index)}><HighlightedText text={option} highlights={questionHighlights.filter((highlight) => highlight.sourceField === "option" && highlight.sourceIndex === index)} onHighlightClick={openSavedHighlight} /></span>
                          </button>)}
                      </div>
                    </div>
                  </div>
                </div>
              </article>;
              });

              if (questionBlock.length > 1) {
                const blockOffset = questionBlock[0].section === "reading" ? readingNumberOffset : 0;
                const range = `${questionBlock[0].position + blockOffset}-${questionBlock[questionBlock.length - 1].position + blockOffset}`;
                const isReadingPairFrame = questionBlock[0].section === "reading";
                return <div
                  key={`shared-question-frame-${range}`}
                  role="group"
                  aria-label={`Khung câu ${range}`}
                  data-testid={`shared-question-frame-${range}`}
                  className={isReadingPairFrame ? "m-4 divide-y divide-slate-200 overflow-hidden rounded-3xl bg-white shadow-sm md:m-6" : "m-4 divide-y divide-cyan-100 overflow-hidden rounded-3xl border-2 border-cyan-200 bg-cyan-50/30 shadow-sm md:m-6"}
                >
                  {renderedQuestions}
                </div>;
              }
              return renderedQuestions[0];
            })}
          </div>

          <div className="border-t border-slate-200 bg-slate-50 px-6 py-7 text-center md:px-8">
            {activeSection === "listening" && hasReading
              ? <button type="button" onClick={() => void switchSection("reading")} className="rounded-2xl bg-[#087eba] px-7 py-4 font-black text-white shadow-sm transition hover:bg-[#066c9f]">Sang phần Đọc →</button>
              : <button type="button" disabled={submitting} onClick={confirmSubmit} className="rounded-2xl bg-emerald-600 px-8 py-4 font-black text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50">{submitting ? "Đang nộp..." : "Nộp bài"}</button>}
          </div>
        </section>

        <aside className="h-fit rounded-3xl bg-white p-5 shadow-sm lg:sticky lg:top-24">
          <div className="flex items-center justify-between"><h2 className="font-black">Danh sách câu</h2><span className="text-xs font-bold text-slate-500">Còn {unansweredInSection}</span></div>
          <div className="mt-4 grid grid-cols-5 gap-2">
            {sectionQuestions.map((question) => {
              const numberOffset = activeSection === "reading" && sectionQuestions.length === 40 ? 30 : 0;
              return <button type="button" key={question.id} onClick={() => jumpToQuestion(question)} className={`relative aspect-square rounded-xl text-sm font-black transition ${activeQuestionId === question.id ? "ring-2 ring-[#10243e] ring-offset-2" : ""} ${answers[question.id] ? "bg-[#087eba] text-white" : "bg-slate-100 text-slate-500 hover:bg-sky-100"}`}>{question.position + numberOffset}{flagged.includes(question.id) && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-amber-400" />}</button>;
            })}
          </div>
          <div className="mt-5 space-y-2 border-t border-slate-200 pt-4 text-xs font-bold text-slate-500"><p><span className="mr-2 inline-block h-3 w-3 rounded bg-[#087eba]" />Đã trả lời</p><p><span className="mr-2 inline-block h-3 w-3 rounded bg-slate-100 ring-1 ring-slate-200" />Chưa trả lời</p><p><span className="mr-2 inline-block h-3 w-3 rounded-full bg-amber-400" />Đánh dấu xem lại</p></div>
          <p className="mt-5 min-h-5 text-center text-xs font-bold text-slate-500">{saving}</p>
        </aside>
      </div>
    </main>
  );
}
