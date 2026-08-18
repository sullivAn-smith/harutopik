"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { VocabularyItem } from "@/content/schema";
import {
  audioReactionRules,
  buildAudioReactionQuestions,
  buildFlashReactionQuestions,
  createAudioReactionPool,
  createFlashReactionPool,
  gradeAudioReaction,
  isCorrectAudioReactionAnswer,
  scoreAudioReactionAnswer,
  type AudioReactionGrade,
  type AudioReactionMode,
  type AudioReactionQuestion,
  type FlashReactionDirection,
  type ReactionGameType,
} from "@/lib/speed-test/audio-reaction-domain";
import type { SpeedTestWordProgress } from "@/lib/speed-test/domain";

type LocalAnswer = {
  questionId: string;
  vocabularyId: string;
  exampleId?: string;
  userAnswer: string;
  reactionTimeMs: number;
  position: number;
  correct: boolean;
  grade: AudioReactionGrade;
  points: number;
  prompt: string;
  expectedAnswer: string;
};

type SavedResult = {
  score: number;
  accuracy: number;
  correctCount: number;
  wrongCount: number;
  bestCombo: number;
  livesRemaining: number;
  counts: Record<AudioReactionGrade, number>;
  personalBest: { highestScore: boolean; previousScore: number; improvement: number; fastestPerfect: boolean };
  ranking?: { attemptsRemaining?: number };
};

type Stage = "setup" | "countdown" | "playing" | "result";
type TurnPhase = "audio" | "answer" | "feedback";

function playFeedbackSound(kind: "correct" | "perfect" | "wrong") {
  try {
    const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = kind === "wrong" ? "sawtooth" : "sine";
    oscillator.frequency.value = kind === "perfect" ? 880 : kind === "correct" ? 660 : 180;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.16);
    oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + 0.18);
    oscillator.addEventListener("ended", () => void context.close(), { once: true });
  } catch {
    // Sound feedback is an enhancement; gameplay must continue without it.
  }
}

function formatTime(milliseconds: number) {
  const minutes = Math.floor(milliseconds / 60_000);
  const seconds = Math.floor((milliseconds % 60_000) / 1_000);
  const hundredths = Math.floor((milliseconds % 1_000) / 10);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(hundredths).padStart(2, "0")}`;
}

export function AudioReactionExperience({
  vocabulary,
  lessonName,
  lessonId,
  courseSlug,
  lessonSlug,
  progressById,
  backHref,
  gameType = "audio_reaction",
  rankedMode = false,
  rankedAttemptsRemaining = 3,
}: {
  vocabulary: VocabularyItem[];
  lessonName: string;
  lessonId: string;
  courseSlug: string;
  lessonSlug: string;
  progressById: Record<string, SpeedTestWordProgress>;
  backHref: string;
  gameType?: ReactionGameType;
  rankedMode?: boolean;
  rankedAttemptsRemaining?: number;
}) {
  const isFlash = gameType === "flash_reaction";
  const [direction, setDirection] = useState<FlashReactionDirection>("ko_vi");
  const pool = useMemo(() => isFlash
    ? createFlashReactionPool(vocabulary, direction)
    : createAudioReactionPool(vocabulary), [direction, isFlash, vocabulary]);
  const wordAudioCount = pool.length;
  const availableCounts = ([10, 20, 30] as const).filter((count) => pool.length >= count);
  const [questionCount, setQuestionCount] = useState<10 | 20 | 30>(rankedMode ? 10 : availableCounts[0] ?? 10);
  const [mode, setMode] = useState<AudioReactionMode>("choose");
  const [rankedRemaining, setRankedRemaining] = useState(rankedAttemptsRemaining);
  const [stage, setStage] = useState<Stage>("setup");
  const [countdown, setCountdown] = useState(3);
  const [questions, setQuestions] = useState<AudioReactionQuestion[]>([]);
  const [position, setPosition] = useState(0);
  const [turnPhase, setTurnPhase] = useState<TurnPhase>("audio");
  const [lives, setLives] = useState<number>(audioReactionRules.startingLives);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<LocalAnswer[]>([]);
  const [value, setValue] = useState("");
  const [feedback, setFeedback] = useState<LocalAnswer | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [audioError, setAudioError] = useState(false);
  const [syncState, setSyncState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [savedResult, setSavedResult] = useState<SavedResult | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const nextAudioRef = useRef<HTMLAudioElement | null>(null);
  const answerStartedAt = useRef(0);
  const gameStartedAt = useRef(0);
  const attemptId = useRef("");
  const startedAt = useRef("");
  const timeoutRef = useRef<number | null>(null);
  const finishing = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const answerQuestionRef = useRef<(answer: string) => void>(() => undefined);
  const question = questions[position];

  const clearAnswerTimeout = useCallback(() => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }, []);

  useEffect(() => () => {
    clearAnswerTimeout();
    audioRef.current?.pause();
    nextAudioRef.current?.pause();
  }, [clearAnswerTimeout]);

  useEffect(() => {
    if (stage !== "countdown") return;
    const timer = window.setTimeout(() => {
      if (countdown > 0) setCountdown((current) => current - 1);
      else {
        gameStartedAt.current = performance.now();
        setElapsedMs(0);
        setStage("playing");
        setTurnPhase("audio");
      }
    }, countdown > 0 ? 500 : 350);
    return () => window.clearTimeout(timer);
  }, [countdown, stage]);

  useEffect(() => {
    if (stage !== "playing") return;
    const timer = window.setInterval(() => setElapsedMs(performance.now() - gameStartedAt.current), 47);
    return () => window.clearInterval(timer);
  }, [stage]);

  const finish = useCallback((finalAnswers: LocalAnswer[], finalBestCombo: number, finalElapsedMs: number) => {
    if (finishing.current) return;
    finishing.current = true;
    clearAnswerTimeout();
    audioRef.current?.pause();
    setElapsedMs(finalElapsedMs);
    setStage("result");
    setSyncState("saving");
    void fetch("/api/v1/audio-reactions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        attemptId: attemptId.current,
        courseSlug,
        lessonSlug,
        mode,
        gameType,
        ranked: rankedMode,
        direction,
        requestedQuestionCount: questionCount,
        questionIds: questions.map((item) => item.id),
        answers: finalAnswers.map((answer) => ({
          questionId: answer.questionId,
          vocabularyId: answer.vocabularyId,
          exampleId: answer.exampleId,
          userAnswer: answer.userAnswer,
          reactionTimeMs: answer.reactionTimeMs,
          position: answer.position,
        })),
        totalTimeMs: Math.round(finalElapsedMs),
        startedAt: startedAt.current,
        finishedAt: new Date().toISOString(),
      }),
    }).then(async (response) => {
      const payload = await response.json().catch(() => null) as { data?: SavedResult } | null;
      if (!response.ok || !payload?.data) throw new Error("save_failed");
      setSavedResult(payload.data);
      setScore(payload.data.score);
      setBestCombo(payload.data.bestCombo);
      setLives(payload.data.livesRemaining);
      if (typeof payload.data.ranking?.attemptsRemaining === "number") {
        setRankedRemaining(payload.data.ranking.attemptsRemaining);
      }
      setSyncState("saved");
    }).catch(() => setSyncState("failed"));
  }, [clearAnswerTimeout, courseSlug, direction, gameType, lessonSlug, mode, questionCount, questions, rankedMode]);

  const answerQuestion = useCallback((userAnswer: string) => {
    if (!question || turnPhase !== "answer" || finishing.current) return;
    clearAnswerTimeout();
    const reactionTimeMs = Math.round(performance.now() - answerStartedAt.current);
    const withinWindow = reactionTimeMs <= audioReactionRules.answerWindowMs[mode];
    const correct = withinWindow && isCorrectAudioReactionAnswer(userAnswer, question);
    const nextCombo = correct ? combo + 1 : 0;
    const nextLives = correct ? lives : Math.max(0, lives - 1);
    const grade = gradeAudioReaction(mode, correct, reactionTimeMs);
    const points = scoreAudioReactionAnswer(question, grade, nextCombo);
    const nextAnswer: LocalAnswer = {
      questionId: question.id,
      vocabularyId: question.vocabularyId,
      exampleId: question.exampleId,
      userAnswer: userAnswer.trim(),
      reactionTimeMs,
      position: position + 1,
      correct,
      grade,
      points,
      prompt: question.korean,
      expectedAnswer: question.correctAnswer,
    };
    const nextAnswers = [...answers, nextAnswer];
    const nextBest = Math.max(bestCombo, nextCombo);
    setAnswers(nextAnswers); setCombo(nextCombo); setBestCombo(nextBest); setLives(nextLives);
    setScore((current) => current + points); setFeedback(nextAnswer); setTurnPhase("feedback");
    if (soundEnabled) playFeedbackSound(correct ? (grade === "perfect" ? "perfect" : "correct") : "wrong");
    window.setTimeout(() => {
      setFeedback(null); setValue("");
      const done = position + 1 >= questions.length || nextLives === 0;
      if (done) finish(nextAnswers, nextBest, performance.now() - gameStartedAt.current);
      else { setAudioError(false); setPosition((current) => current + 1); setTurnPhase("audio"); }
    }, audioReactionRules.feedbackDelayMs);
  }, [answers, bestCombo, clearAnswerTimeout, combo, finish, lives, mode, position, question, questions.length, soundEnabled, turnPhase]);
  useEffect(() => { answerQuestionRef.current = answerQuestion; }, [answerQuestion]);

  useEffect(() => {
    if (stage !== "playing" || turnPhase !== "audio" || !question) return;
    if (isFlash) {
      const startTimer = window.setTimeout(() => {
        answerStartedAt.current = performance.now();
        setTurnPhase("answer");
        timeoutRef.current = window.setTimeout(() => answerQuestionRef.current(""), audioReactionRules.answerWindowMs[mode]);
        window.setTimeout(() => inputRef.current?.focus(), 0);
      }, 0);
      return () => window.clearTimeout(startTimer);
    }
    const audio = new Audio(question.audioUrl);
    audio.preload = "auto";
    audioRef.current = audio;
    const next = questions[position + 1];
    nextAudioRef.current = next ? new Audio(next.audioUrl) : null;
    if (nextAudioRef.current) nextAudioRef.current.preload = "auto";
    audio.onended = () => {
      answerStartedAt.current = performance.now();
      setTurnPhase("answer");
      timeoutRef.current = window.setTimeout(() => answerQuestionRef.current(""), audioReactionRules.answerWindowMs[mode]);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    };
    audio.onerror = () => setAudioError(true);
    void audio.play().catch(() => setAudioError(true));
    return () => { audio.onended = null; audio.onerror = null; audio.pause(); };
  }, [isFlash, mode, position, question, questions, stage, turnPhase]);

  function start() {
    const selected = isFlash
      ? buildFlashReactionQuestions({ vocabulary, direction, questionCount, progressById: rankedMode ? {} : progressById })
      : buildAudioReactionQuestions({ vocabulary, questionCount, progressById: rankedMode ? {} : progressById });
    if (selected.length < questionCount) return;
    setQuestions(selected); setPosition(0); setLives(audioReactionRules.startingLives); setCombo(0);
    setBestCombo(0); setScore(0); setAnswers([]); setValue(""); setFeedback(null); setSavedResult(null);
    setSyncState("idle"); setAudioError(false); setCountdown(3); setStage("countdown"); setTurnPhase("audio");
    attemptId.current = crypto.randomUUID(); startedAt.current = new Date().toISOString(); finishing.current = false;
  }

  function retryAudio() {
    if (!question) return;
    setAudioError(false);
    const audio = new Audio(question.audioUrl);
    audioRef.current = audio;
    audio.onended = () => {
      answerStartedAt.current = performance.now(); setTurnPhase("answer");
      timeoutRef.current = window.setTimeout(() => answerQuestionRef.current(""), audioReactionRules.answerWindowMs[mode]);
    };
    audio.onerror = () => setAudioError(true);
    void audio.play().catch(() => setAudioError(true));
  }

  if (stage === "setup") return <SetupScreen lessonName={lessonName} poolSize={pool.length} wordAudioCount={wordAudioCount} availableCounts={availableCounts} questionCount={questionCount} setQuestionCount={setQuestionCount} mode={mode} setMode={setMode} direction={direction} setDirection={setDirection} gameType={gameType} soundEnabled={soundEnabled} setSoundEnabled={setSoundEnabled} backHref={backHref} onStart={start} rankedMode={rankedMode} rankedRemaining={rankedRemaining} />;
  if (stage === "countdown") return <CountdownScreen value={countdown} />;
  if (stage === "result") return <ResultScreen lessonName={lessonName} answered={answers.length} total={questions.length} score={score} elapsedMs={elapsedMs} lives={lives} bestCombo={bestCombo} answers={answers} savedResult={savedResult} syncState={syncState} backHref={backHref} historyHref={`/speed-test/lich-su?sourceKind=lesson&sourceId=${encodeURIComponent(lessonId)}`} onRetry={() => { setStage("setup"); }} />;

  return (
    <main className={`audio-reaction-stage min-h-dvh overflow-hidden bg-[radial-gradient(circle_at_top,#fff7c2_0%,#ffe477_52%,#ffc928_100%)] px-3 py-4 text-amber-950 sm:px-6 sm:py-7 ${feedback && !feedback.correct ? "audio-reaction-shake" : ""}`}>
      <section className="mx-auto flex min-h-[calc(100dvh-2rem)] max-w-4xl flex-col rounded-[2rem] border border-amber-200 bg-white/92 p-4 shadow-[0_26px_80px_rgba(125,78,0,.2)] backdrop-blur sm:min-h-[calc(100dvh-3.5rem)] sm:p-7">
        <header className="grid grid-cols-3 items-center gap-2 text-center">
          <div className="flex gap-1 text-lg sm:text-2xl" aria-label={`Còn ${lives} mạng`}>{Array.from({ length: 5 }, (_, index) => <span key={index}>{index < lives ? "❤️" : "🖤"}</span>)}</div>
          <b className="text-sm text-orange-600 sm:text-xl">🔥 {combo} COMBO</b>
          <b className="text-right font-mono text-sm text-amber-800 sm:text-xl">⏱ {formatTime(elapsedMs)}</b>
        </header>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-amber-100"><div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all" style={{ width: `${((position + 1) / questions.length) * 100}%` }} /></div>

        <div className="relative flex flex-1 flex-col items-center justify-center py-5 text-center">
          <p className="text-xs font-black uppercase tracking-[.2em] text-amber-700">{isFlash ? "Phản xạ thẻ từ" : "Nghe từ vựng"} · {position + 1}/{questions.length}</p>
          {!isFlash && <button type="button" disabled={turnPhase !== "audio" || !audioError} onClick={retryAudio} className={`mt-5 grid h-24 w-24 place-items-center rounded-full border-4 text-5xl shadow-[0_0_45px_rgba(245,158,11,.3)] transition sm:h-28 sm:w-28 ${audioError ? "border-orange-400 bg-orange-100" : "animate-pulse border-amber-400 bg-amber-100"}`} aria-label={audioError ? "Phát lại audio" : "Audio đang phát"}>🔊</button>}
          {!isFlash && audioError && <p className="mt-3 font-bold text-orange-700">Không thể tự phát. Chạm vào loa để thử lại.</p>}
          <h1 lang={isFlash && direction === "vi_ko" ? "vi" : "ko"} className="mt-5 text-3xl font-black sm:text-5xl">{question.korean}</h1>
          <p className="mt-2 min-h-6 font-bold text-amber-900/55">{turnPhase === "audio" ? (isFlash ? "Chuẩn bị…" : "Nghe kỹ…") : turnPhase === "answer" ? `Trả lời trong ${mode === "choose" ? "2" : "3"} giây` : ""}</p>

          {turnPhase !== "audio" && mode === "choose" && (
            <div className="mt-5 grid w-full max-w-2xl gap-3 sm:grid-cols-2">
              {question.options.map((option, index) => <button key={`${option}-${index}`} disabled={turnPhase !== "answer"} onClick={() => answerQuestion(option)} className="min-h-14 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left font-black shadow-md transition enabled:hover:-translate-y-0.5 enabled:hover:border-amber-500 enabled:hover:bg-amber-100 disabled:opacity-60"><span className="mr-3 text-amber-600">{String.fromCharCode(65 + index)}.</span>{option}</button>)}
            </div>
          )}
          {turnPhase !== "audio" && mode === "type" && (
            <form onSubmit={(event) => { event.preventDefault(); if (value.trim()) answerQuestion(value); }} className="mt-5 flex w-full max-w-2xl flex-col gap-3 sm:flex-row">
              <input ref={inputRef} value={value} onChange={(event) => setValue(event.target.value)} disabled={turnPhase !== "answer"} placeholder="Gõ nghĩa tiếng Việt…" className="min-h-14 min-w-0 flex-1 rounded-2xl border-2 border-amber-300 bg-white px-5 text-lg font-bold text-amber-950 outline-none focus:border-orange-500" />
              <button disabled={turnPhase !== "answer" || !value.trim()} className="min-h-14 rounded-2xl bg-amber-400 px-7 font-black text-amber-950 disabled:opacity-50">TRẢ LỜI</button>
            </form>
          )}

          {feedback && <div className={`absolute inset-x-3 top-1/2 z-20 mx-auto max-w-md -translate-y-1/2 rounded-3xl border-2 p-7 text-white shadow-2xl backdrop-blur ${feedback.correct ? "border-emerald-300 bg-emerald-600/95" : "border-red-300 bg-red-600/95"}`}><p className="text-4xl font-black">{feedback.correct ? `${feedback.grade === "perfect" ? "⚡" : "✓"} ${feedback.grade === "perfect" ? "HOÀN HẢO" : feedback.grade === "great" ? "RẤT TỐT" : "TỐT"}!` : "✕ SAI"}</p><p className="mt-2 text-xl font-black">{feedback.correct ? `+${feedback.points}` : "-1 ❤️"}</p>{!feedback.correct && <p className="mt-2 font-bold">Đáp án đúng: {question.correctAnswer}</p>}</div>}
        </div>
        <footer className="flex items-center justify-between text-sm font-bold text-amber-900/60"><span>{mode === "choose" ? "🎧 CHỌN" : "⌨️ GÕ"}</span><span className="text-lg text-amber-700">{score.toLocaleString("vi-VN")} điểm</span></footer>
      </section>
    </main>
  );
}

function SetupScreen({ lessonName, poolSize, wordAudioCount, availableCounts, questionCount, setQuestionCount, mode, setMode, direction, setDirection, gameType, soundEnabled, setSoundEnabled, backHref, onStart, rankedMode, rankedRemaining }: {
  lessonName: string; poolSize: number; wordAudioCount: number;
  availableCounts: readonly (10 | 20 | 30)[]; questionCount: 10 | 20 | 30;
  setQuestionCount: (count: 10 | 20 | 30) => void; mode: AudioReactionMode;
  setMode: (mode: AudioReactionMode) => void; direction: FlashReactionDirection;
  setDirection: (direction: FlashReactionDirection) => void; gameType: ReactionGameType;
  soundEnabled: boolean; setSoundEnabled: (enabled: boolean) => void; backHref: string; onStart: () => void;
  rankedMode: boolean; rankedRemaining: number;
}) {
  const isFlash = gameType === "flash_reaction";
  return <main className="min-h-dvh bg-[radial-gradient(circle_at_top_left,#fff9d7_0%,transparent_34rem),linear-gradient(145deg,#fffdf6,#ffe477)] px-4 py-6 text-amber-950 sm:py-10"><section className="mx-auto max-w-4xl"><Link href={rankedMode ? "/bang-xep-hang?board=audio_reaction" : backHref} className="inline-flex rounded-2xl border border-amber-200 bg-white px-5 py-3 font-black shadow-md">← {rankedMode ? "Bảng xếp hạng" : "Về bài học"}</Link><div className="mt-6 overflow-hidden rounded-[2rem] border border-amber-200 bg-white/94 p-6 shadow-[0_24px_70px_rgba(132,82,0,.18)] sm:p-10"><p className="text-sm font-black uppercase tracking-[.22em] text-amber-600">{rankedMode ? "♛ Harutopik League" : "⚡ Audio Reaction"}</p><h1 className="mt-2 text-4xl font-black sm:text-5xl">{rankedMode ? "Audio Reaction xếp hạng" : "Chọn thử thách"}</h1><p className="mt-3 font-semibold text-amber-900/60">{lessonName}</p>{rankedMode && <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4"><span><b className="block">10 câu được trộn · Chọn đáp án</b><small className="font-bold text-amber-800/65">Mọi người chơi cùng cấu hình</small></span><strong className="rounded-full bg-amber-300 px-4 py-2">Còn {rankedRemaining}/3 lượt</strong></div>}<div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 font-bold"><p>{poolSize} {isFlash ? "từ vựng khả dụng" : "từ có audio khả dụng"}</p><p className="mt-1 text-sm text-amber-900/55">{isFlash ? "Câu hỏi được chọn thích ứng theo độ chính xác, tốc độ và lịch ôn của bạn" : `${wordAudioCount} từ đơn · Audio câu ví dụ không được sử dụng`}</p></div>{isFlash && <><h2 className="mt-7 font-black uppercase tracking-wider text-amber-700">Chiều phản xạ</h2><div className="mt-3 grid gap-3 sm:grid-cols-2"><button disabled={rankedMode} onClick={() => setDirection("ko_vi")} className={`rounded-2xl border-2 p-4 font-black ${direction === "ko_vi" ? "border-amber-500 bg-amber-100" : "border-amber-200"}`}>Hàn → Việt</button><button disabled={rankedMode} onClick={() => setDirection("vi_ko")} className={`rounded-2xl border-2 p-4 font-black ${direction === "vi_ko" ? "border-amber-500 bg-amber-100" : "border-amber-200"}`}>Việt → Hàn</button></div></>}<h2 className="mt-7 font-black uppercase tracking-wider text-amber-700">Số câu</h2><div className="mt-3 grid grid-cols-3 gap-3">{([10,20,30] as const).map((count) => { const enabled = availableCounts.includes(count); return <button key={count} disabled={!enabled||rankedMode} onClick={() => setQuestionCount(count)} className={`rounded-2xl border-2 px-2 py-4 text-2xl font-black transition disabled:cursor-not-allowed sm:px-4 ${questionCount === count && enabled ? "border-amber-500 bg-amber-300 shadow-lg" : enabled ? "border-amber-200 bg-amber-50 hover:border-amber-400" : "border-stone-100 bg-stone-50 text-stone-300"}`}>{count}<span className="mt-1 block text-[.62rem] uppercase tracking-wider">{enabled ? "câu" : isFlash ? "chưa đủ từ" : "chưa đủ audio từ"}</span></button>; })}</div><h2 className="mt-7 font-black uppercase tracking-wider text-amber-700">Chế độ</h2><div className="mt-3 grid gap-3 sm:grid-cols-2"><button disabled={rankedMode} onClick={() => setMode("choose")} className={`rounded-2xl border-2 p-5 text-left transition disabled:cursor-not-allowed ${mode === "choose" ? "border-amber-500 bg-amber-100 shadow-lg" : "border-amber-200 bg-white"}`}><b className="text-xl">🎯 CHỌN</b><span className="mt-1 block text-sm text-amber-900/55">Chọn đáp án trong 2 giây</span></button><button disabled={rankedMode} onClick={() => setMode("type")} className={`rounded-2xl border-2 p-5 text-left transition disabled:cursor-not-allowed ${mode === "type" ? "border-amber-500 bg-amber-100 shadow-lg" : "border-amber-200 bg-white"}`}><b className="text-xl">⌨️ GÕ</b><span className="mt-1 block text-sm text-amber-900/55">Gõ đáp án trong 3 giây</span></button></div><label className="mt-6 flex cursor-pointer items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 p-4 font-bold"><span>🔔 Âm thanh phản hồi</span><input type="checkbox" checked={soundEnabled} onChange={(event) => setSoundEnabled(event.target.checked)} className="h-5 w-5 accent-amber-500" /></label><button disabled={!availableCounts.includes(questionCount)||rankedRemaining<=0} onClick={onStart} className="mt-8 w-full rounded-2xl bg-gradient-to-r from-amber-300 to-orange-400 px-6 py-4 text-xl font-black text-amber-950 shadow-xl transition hover:-translate-y-0.5 disabled:opacity-40">{rankedRemaining<=0?"ĐÃ HẾT LƯỢT HÔM NAY":rankedMode?"BẮT ĐẦU XẾP HẠNG ♛":"BẮT ĐẦU ⚡"}</button></div></section></main>;
}

function CountdownScreen({ value }: { value: number }) {
  return <main className="grid min-h-dvh place-items-center overflow-hidden bg-[radial-gradient(circle,#fff9ce,#ffd43b)] text-center text-amber-950"><div><p className="text-xl font-black uppercase tracking-[.3em] text-amber-700">Sẵn sàng?</p><p className="mt-5 text-[9rem] font-black leading-none drop-shadow-[0_0_35px_rgba(245,158,11,.4)] sm:text-[12rem]">{value || "BẮT ĐẦU!"}</p></div></main>;
}

function ResultScreen({ lessonName, answered, total, score, elapsedMs, lives, bestCombo, answers, savedResult, syncState, backHref, historyHref, onRetry }: {
  lessonName: string; answered: number; total: number; score: number; elapsedMs: number; lives: number; bestCombo: number; answers: LocalAnswer[]; savedResult: SavedResult | null; syncState: "idle" | "saving" | "saved" | "failed"; backHref: string; historyHref: string; onRetry: () => void;
}) {
  const correct = savedResult?.correctCount ?? answers.filter((answer) => answer.correct).length;
  const accuracy = savedResult?.accuracy ?? (answered ? Math.round((correct / answered) * 100) : 0);
  const newRecord = savedResult?.personalBest.highestScore;
  const weakAnswers = answers.filter((answer) => !answer.correct || answer.grade === "good").slice(0, 5);
  const averageReaction = answered ? Math.round(answers.reduce((sum, answer) => sum + answer.reactionTimeMs, 0) / answered) : 0;
  return <main className="min-h-dvh bg-[radial-gradient(circle_at_top,#fff9d7_0%,#ffe477_58%,#ffc928_100%)] px-4 py-7 text-amber-950"><section className="mx-auto max-w-3xl rounded-[2.5rem] border border-amber-200 bg-white/94 p-6 text-center shadow-[0_24px_70px_rgba(132,82,0,.2)] sm:p-10"><p className="text-sm font-black uppercase tracking-[.25em] text-amber-600">⚡ {lives === 0 && answered < total ? "Hết mạng" : "Hoàn thành"}</p><h1 className="mt-3 text-5xl font-black text-amber-500 sm:text-7xl">{score.toLocaleString("vi-VN")}</h1><p className="font-black uppercase tracking-widest text-amber-900/50">Điểm</p>{newRecord && <div className="mx-auto mt-5 w-fit rounded-full bg-gradient-to-r from-amber-300 to-orange-400 px-5 py-2 font-black shadow-lg">🏆 KỶ LỤC CÁ NHÂN MỚI +{savedResult.personalBest.improvement.toLocaleString("vi-VN")}</div>}<p className="mt-5 font-semibold text-amber-900/55">{lessonName}</p><div className="mt-7 grid grid-cols-2 gap-3 text-left sm:grid-cols-3"><ResultMetric label="Thời gian" value={`⏱ ${formatTime(elapsedMs)}`} /><ResultMetric label="Chính xác" value={`🎯 ${correct}/${answered}`} /><ResultMetric label="Độ chính xác" value={`⚡ ${accuracy}%`} /><ResultMetric label="Combo cao nhất" value={`🔥 ${bestCombo}`} /><ResultMetric label="Phản xạ trung bình" value={`${(averageReaction / 1000).toFixed(2)}s`} /><ResultMetric label="Cần ôn lại" value={`${weakAnswers.length} từ`} /></div>{weakAnswers.length > 0 && <div className="mt-5 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-left"><h2 className="font-black text-orange-900">Từ cần ưu tiên ở lượt sau</h2><div className="mt-2 grid gap-2 sm:grid-cols-2">{weakAnswers.map((answer) => <span key={answer.questionId} className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-orange-800"><b>{answer.prompt}</b> → {answer.expectedAnswer}</span>)}</div></div>}<p className={`mt-5 text-sm font-bold ${syncState === "failed" ? "text-red-600" : "text-amber-900/50"}`}>{syncState === "saving" ? "Đang lưu kết quả…" : syncState === "saved" ? "✓ Kết quả và kỷ lục của bạn đã được lưu" : syncState === "failed" ? "Không thể lưu kết quả. Vui lòng kiểm tra kết nối dữ liệu." : ""}</p><div className="mt-7 grid gap-3 sm:grid-cols-3"><button onClick={onRetry} className="rounded-2xl bg-amber-300 px-6 py-4 font-black shadow-lg">CHƠI LẠI</button><Link href={historyHref} className="rounded-2xl border border-amber-300 bg-amber-50 px-6 py-4 font-black">LỊCH SỬ</Link><Link href={backHref} className="rounded-2xl border border-stone-200 bg-white px-6 py-4 font-black">THOÁT</Link></div></section></main>;
}

function ResultMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4"><b className="text-lg sm:text-xl">{value}</b><span className="mt-1 block text-xs font-bold uppercase tracking-wider text-amber-900/45">{label}</span></div>;
}
