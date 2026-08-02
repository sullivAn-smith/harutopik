"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { ExamSection } from "@/lib/exams/types";

type Question = {
  id: string; position: number; section: ExamSection; instruction: string;
  prompt: string; audioUrl: string; imageUrl: string; options: string[];
};

export function ExamRunner({ attemptId, examId, title, section, expiresAt, initialPosition, initialAnswers, initialFlagged, initialAudioPlays, initialWindowLeaveCount, questions }: {
  attemptId: string; examId: string; title: string; section: ExamSection;
  expiresAt: string; initialPosition: number; initialAnswers: Record<string, number>;
  initialFlagged: string[]; initialAudioPlays: Record<string, number>;
  initialWindowLeaveCount: number; questions: Question[];
}) {
  const router = useRouter();
  const sectionQuestions = useMemo(() => questions.filter((question) => question.section === section), [questions, section]);
  const [position, setPosition] = useState(Math.min(Math.max(initialPosition - 1, 0), Math.max(sectionQuestions.length - 1, 0)));
  const [answers, setAnswers] = useState(initialAnswers);
  const [flagged, setFlagged] = useState(initialFlagged);
  const [audioPlays, setAudioPlays] = useState(initialAudioPlays);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioFinished, setAudioFinished] = useState(() => {
    const initial = sectionQuestions[Math.min(Math.max(initialPosition - 1, 0), Math.max(sectionQuestions.length - 1, 0))];
    return initial ? (initialAudioPlays[initial.id] ?? 0) >= 1 : false;
  });
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.floor((Date.parse(expiresAt) - Date.now()) / 1000)));
  const [saving, setSaving] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [windowLeaveCount, setWindowLeaveCount] = useState(initialWindowLeaveCount);
  const [warning, setWarning] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const lastWindowEvent = useRef(0);
  const wasFullscreen = useRef(false);
  const current = sectionQuestions[position];

  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    const response = await fetch(`/api/v1/exam-attempts/${attemptId}/submit`, { method: "POST" });
    if (response.ok) router.replace(`/luyen-de/${examId}/ket-qua?attempt=${attemptId}`);
    else { setSaving("Nộp bài thất bại. Hãy kiểm tra mạng và thử lại."); setSubmitting(false); }
  }

  async function moveToReading() {
    if (submitting) return;
    setSubmitting(true);
    const response = await fetch(`/api/v1/exam-attempts/${attemptId}/section`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ section: "reading" }),
    });
    if (response.ok) router.refresh();
    else { setSaving("Chưa thể chuyển sang phần Đọc."); setSubmitting(false); }
  }

  useEffect(() => {
    const timer = window.setInterval(() => {
      const value = Math.max(0, Math.floor((Date.parse(expiresAt) - Date.now()) / 1000));
      setRemaining(value);
      if (value === 0) {
        window.clearInterval(timer);
        if (section === "listening") void moveToReading(); else void submit();
      }
    }, 1000);
    return () => window.clearInterval(timer);
    // section expiry intentionally owns the transition
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt, section]);

  useEffect(() => {
    async function record(eventType: "hidden" | "blur" | "fullscreen_exit") {
      const now = Date.now(); if (now - lastWindowEvent.current < 2000) return;
      lastWindowEvent.current = now;
      const response = await fetch(`/api/v1/exam-attempts/${attemptId}/window-event`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ section, eventType }), keepalive: true,
      });
      if (response.ok) {
        const body = await response.json(); setWindowLeaveCount(Number(body.data?.count ?? windowLeaveCount + 1));
      } else setWindowLeaveCount((count) => count + 1);
      setWarning(true);
    }
    const visibility = () => { if (document.visibilityState === "hidden") void record("hidden"); };
    const blur = () => void record("blur");
    const fullscreen = () => { if (document.fullscreenElement) wasFullscreen.current = true; else if (wasFullscreen.current) void record("fullscreen_exit"); };
    document.addEventListener("visibilitychange", visibility); document.addEventListener("fullscreenchange", fullscreen); window.addEventListener("blur", blur);
    return () => { document.removeEventListener("visibilitychange", visibility); document.removeEventListener("fullscreenchange", fullscreen); window.removeEventListener("blur", blur); };
  }, [attemptId, section, windowLeaveCount]);

  async function choose(option: number, nextPosition = position + 1) {
    if (!current) return false;
    setAnswers((all) => ({ ...all, [current.id]: option })); setSaving("Đang lưu...");
    const response = await fetch(`/api/v1/exam-attempts/${attemptId}/answer`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ questionId: current.id, option, currentPosition: nextPosition, flagged }),
    });
    setSaving(response.ok ? "Đã lưu" : "Chưa lưu được đáp án");
    return response.ok;
  }

  async function playAudio() {
    if (!current || section !== "listening" || audioPlaying || (audioPlays[current.id] ?? 0) >= 1) return;
    setSaving("Đang chuẩn bị audio...");
    const response = await fetch(`/api/v1/exam-attempts/${attemptId}/audio`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ questionId: current.id }),
    });
    if (!response.ok) { setSaving("Không thể bắt đầu audio. Hãy tải lại trang."); return; }
    setAudioPlays((all) => ({ ...all, [current.id]: 1 }));
    setAudioPlaying(true); setSaving("Audio đang phát — không thể tạm dừng hoặc tua.");
    try { audioRef.current!.currentTime = 0; await audioRef.current!.play(); }
    catch { setAudioPlaying(false); setSaving("Trình duyệt chưa phát được audio."); }
  }

  async function nextListening() {
    if (!current || !answers[current.id] || !audioFinished) return;
    const next = position + 1;
    if (!(await choose(answers[current.id], next + 1))) return;
    if (next >= sectionQuestions.length) { await moveToReading(); return; }
    setPosition(next); setAudioFinished(false); setSaving("");
  }

  function toggleFlag() {
    if (!current || section !== "reading") return;
    const next = flagged.includes(current.id) ? flagged.filter((id) => id !== current.id) : [...flagged, current.id];
    setFlagged(next);
    void fetch(`/api/v1/exam-attempts/${attemptId}/answer`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ questionId: current.id, option: answers[current.id] ?? null, currentPosition: position + 1, flagged: next }),
    });
  }

  if (!current) return null;
  const minutes = String(Math.floor(remaining / 60)).padStart(2, "0");
  const seconds = String(remaining % 60).padStart(2, "0");
  const unanswered = sectionQuestions.filter((question) => !answers[question.id]).length;

  return <main className="min-h-screen bg-[#eef7fc] text-[#10243e]">
    <header className="sticky top-0 z-20 border-b bg-white/95 px-5 py-3 backdrop-blur"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><Image src="/harutopik-logo-key.png" alt="Haru" width={38} height={38} /><div><p className="text-xs font-black uppercase tracking-widest text-[#087eba]">TOPIK I · {section === "listening" ? "Phần Nghe" : "Phần Đọc"}</p><h1 className="font-black">{title}</h1></div></div><div className="flex items-center gap-2"><span className="rounded-full bg-sky-100 px-3 py-2 text-xs font-black text-sky-800">Chuẩn bị ✓　Nghe {section === "listening" ? "●" : "✓"}　Đọc {section === "reading" ? "●" : "○"}　Kết quả ○</span><div className={`rounded-2xl px-5 py-3 text-xl font-black ${remaining < 300 ? "bg-red-100 text-red-700" : "bg-sky-100 text-[#087eba]"}`}>{minutes}:{seconds}</div></div></div></header>
    {warning && <div role="alert" className="sticky top-[76px] z-10 bg-red-600 px-5 py-3 text-center font-black text-white">Cảnh báo: bạn đã rời cửa sổ thi {windowLeaveCount} lần. <button type="button" className="ml-3 underline" onClick={() => setWarning(false)}>Đã hiểu</button></div>}
    <div className="mx-auto grid max-w-7xl gap-6 px-5 py-7 lg:grid-cols-[minmax(0,1fr)_280px]"><section className="rounded-3xl bg-white p-6 shadow-sm md:p-8"><div className="flex items-center justify-between"><p className="font-black text-[#087eba]">Câu {position + 1}/{sectionQuestions.length}</p>{section === "reading" && <button type="button" onClick={toggleFlag} className={`rounded-full px-4 py-2 text-sm font-black ${flagged.includes(current.id) ? "bg-amber-200 text-amber-900" : "bg-slate-100 text-slate-600"}`}>⚑ {flagged.includes(current.id) ? "Đã đánh dấu" : "Xem lại"}</button>}</div><h2 className="mt-5 text-xl font-black">{current.instruction}</h2>{current.prompt && <p className="mt-2 text-lg font-semibold text-slate-600">{current.prompt}</p>}{current.imageUrl && <Image unoptimized width={800} height={500} src={current.imageUrl} alt="Minh họa câu hỏi" className="mt-5 max-h-80 w-auto rounded-2xl object-contain" />}
      {section === "listening" && <div className="mt-6 rounded-2xl bg-violet-50 p-5"><audio ref={audioRef} src={current.audioUrl} preload="metadata" onEnded={() => { setAudioPlaying(false); setAudioFinished(true); setSaving("Audio đã phát xong. Hãy chọn đáp án."); }} /><button type="button" onClick={() => void playAudio()} disabled={audioPlaying || (audioPlays[current.id] ?? 0) >= 1} className="rounded-xl bg-violet-600 px-5 py-3 font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300">{audioPlaying ? "Đang phát audio…" : (audioPlays[current.id] ?? 0) >= 1 ? "Đã nghe audio" : "▶ Bắt đầu nghe"}</button><p className="mt-2 text-sm font-bold text-slate-500">Audio phát một lần từ đầu đến cuối, không thể tạm dừng hoặc tua.</p></div>}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">{current.options.map((option, index) => <button type="button" key={index} aria-label={`Đáp án ${index + 1}: ${option}`} disabled={section === "listening" && (!audioFinished || audioPlaying)} onClick={() => void choose(index + 1)} className={`flex min-h-16 items-center gap-3 rounded-2xl border-2 p-4 text-left font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${answers[current.id] === index + 1 ? "border-[#087eba] bg-sky-100 text-[#075f88]" : "border-slate-200 hover:border-sky-300"}`}><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white">{index + 1}</span>{option}</button>)}</div>
      <div className="mt-7 flex items-center justify-between">{section === "reading" ? <button type="button" disabled={position === 0} onClick={() => setPosition((value) => value - 1)} className="rounded-xl border px-4 py-3 font-black disabled:opacity-30">← Câu trước</button> : <span />}<span className="text-sm font-bold text-slate-500">{saving}</span>{section === "listening" ? <button type="button" disabled={!audioFinished || !answers[current.id] || submitting} onClick={() => void nextListening()} className="rounded-xl bg-[#087eba] px-4 py-3 font-black text-white disabled:opacity-30">{position === sectionQuestions.length - 1 ? "Sang phần Đọc →" : "Khóa câu và tiếp tục →"}</button> : <button type="button" disabled={position === sectionQuestions.length - 1} onClick={() => setPosition((value) => value + 1)} className="rounded-xl bg-[#087eba] px-4 py-3 font-black text-white disabled:opacity-30">Câu sau →</button>}</div></section>
      <aside className="h-fit rounded-3xl bg-white p-5 shadow-sm lg:sticky lg:top-24"><div className="flex items-center justify-between"><h2 className="font-black">Danh sách câu</h2><span className="text-xs font-bold text-slate-500">Còn {unanswered}</span></div><div className="mt-4 grid grid-cols-5 gap-2">{sectionQuestions.map((question, index) => <button type="button" key={question.id} disabled={section === "listening" && index !== position} onClick={() => setPosition(index)} className={`relative aspect-square rounded-xl text-sm font-black disabled:cursor-not-allowed ${index === position ? "ring-2 ring-[#10243e] ring-offset-2" : ""} ${answers[question.id] ? "bg-[#087eba] text-white" : "bg-slate-100 text-slate-500"}`}>{index + 1}{flagged.includes(question.id) && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-amber-400" />}</button>)}</div>{section === "reading" && <button type="button" disabled={submitting} onClick={() => { if (window.confirm(`Nộp bài ngay? Bạn còn ${unanswered} câu chưa trả lời.`)) void submit(); }} className="mt-6 w-full rounded-xl bg-emerald-600 px-4 py-3 font-black text-white disabled:opacity-50">{submitting ? "Đang nộp..." : "Nộp bài"}</button>}</aside>
    </div>
  </main>;
}
