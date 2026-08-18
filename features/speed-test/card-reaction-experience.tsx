"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import type { VocabularyItem } from "@/content/schema";
import {
  cardReactionLevels,
  cardReactionRules,
  createCardReactionBoard,
  gradeCardAnswer,
  isCorrectCardAnswer,
  scoreCardAnswer,
  type CardReactionCard,
  type CardReactionDirection,
  type CardReactionGrade,
  type CardReactionLevel,
  type CardReactionMode,
} from "@/lib/speed-test/card-reaction-domain";
import type { SpeedTestWordProgress } from "@/lib/speed-test/domain";
import { GameMusicControl, useGameBackgroundMusic } from "./game-background-music";

type CardState = "hidden" | "revealed" | "correct";
type Stage = "setup" | "countdown" | "playing" | "result";
type Answer = { cardId: string; userAnswer: string; reactionTimeMs: number; position: number; correct: boolean; grade: CardReactionGrade; points: number; revenge: boolean };
type SavedResult = { score: number; accuracy: number; correctCount: number; wrongCount: number; bestCombo: number; perfectCount: number; clearedCards: number; revengeCount: number; personalBest: { fastestClear: boolean; highestScore: boolean } };
type GameConfig = { level: CardReactionLevel; direction: CardReactionDirection; mode: CardReactionMode };
const settingsKey = "haru:card-reaction-settings:v1";

function feedbackSound(kind: "correct" | "wrong" | "last" | "clear") {
  try {
    const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = kind === "wrong" ? 170 : kind === "clear" ? 980 : kind === "last" ? 820 : 680;
    oscillator.type = kind === "wrong" ? "sawtooth" : "sine";
    gain.gain.setValueAtTime(0.001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.13, context.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.2);
    oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + 0.22);
    oscillator.addEventListener("ended", () => void context.close(), { once: true });
  } catch { /* optional enhancement */ }
}

function formatCountdown(milliseconds: number) {
  const seconds = Math.max(0, milliseconds) / 1000;
  return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toFixed(2).padStart(5, "0")}`;
}

export function CardReactionExperience({ vocabulary, lessonName, lessonId, courseSlug, lessonSlug, progressById, backHref }: {
  vocabulary: VocabularyItem[]; lessonName: string; lessonId: string; courseSlug: string; lessonSlug: string;
  progressById: Record<string, SpeedTestWordProgress>; backHref: string;
}) {
  const [stage, setStage] = useState<Stage>("setup");
  const [level, setLevel] = useState<CardReactionLevel>(vocabulary.length >= 16 ? "medium" : "easy");
  const [direction, setDirection] = useState<CardReactionDirection>("mixed");
  const [mode, setMode] = useState<CardReactionMode>("choose");
  const [sound, setSound] = useState(true);
  const [countdown, setCountdown] = useState(3);
  const [cards, setCards] = useState<CardReactionCard[]>([]);
  const [states, setStates] = useState<Record<string, CardState>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [weakIds, setWeakIds] = useState<Set<string>>(new Set());
  const [lives, setLives] = useState(5);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [score, setScore] = useState(0);
  const [remainingMs, setRemainingMs] = useState(0);
  const [feedback, setFeedback] = useState<{ correct: boolean; grade: CardReactionGrade; points: number; revenge: boolean } | null>(null);
  const [saved, setSaved] = useState<SavedResult | null>(null);
  const [sync, setSync] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const startedAt = useRef("");
  const attemptId = useRef("");
  const answerStartedAt = useRef(0);
  const deadline = useRef(0);
  const finishing = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeCard = cards.find((card) => card.id === activeId);
  const cleared = Object.values(states).filter((state) => state === "correct").length;
  const remainingCards = cards.length - cleared;
  const danger = stage === "playing" && (remainingCards <= 3 || remainingMs <= 10_000);
  const gameMusic = useGameBackgroundMusic(
    stage === "countdown" || stage === "playing",
    "/audio/game/background-card.mp3",
  );

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(settingsKey);
      if (!raw) return;
      const stored = JSON.parse(raw) as Partial<GameConfig> & { sound?: boolean };
      const timer = window.setTimeout(() => {
        if (stored.level && cardReactionLevels.includes(stored.level) && vocabulary.length >= cardReactionRules.levels[stored.level].cards) setLevel(stored.level);
        if (stored.direction && ["ko_vi", "vi_ko", "mixed"].includes(stored.direction)) setDirection(stored.direction);
        if (stored.mode && ["choose", "type"].includes(stored.mode)) setMode(stored.mode);
        if (typeof stored.sound === "boolean") setSound(stored.sound);
      }, 0);
      return () => window.clearTimeout(timer);
    } catch { /* invalid local preference: keep safe defaults */ }
  }, [vocabulary.length]);

  useEffect(() => {
    if (stage !== "setup") return;
    try { window.localStorage.setItem(settingsKey, JSON.stringify({ level, direction, mode, sound })); } catch { /* storage is optional */ }
  }, [direction, level, mode, sound, stage]);

  const finish = useCallback((finalAnswers: Answer[], finalRemaining: number) => {
    if (finishing.current) return;
    finishing.current = true;
    setRemainingMs(Math.max(0, finalRemaining));
    setStage("result"); setSync("saving");
    void fetch("/api/v1/card-reactions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
      attemptId: attemptId.current, courseSlug, lessonSlug, level, direction, mode,
      boardCardIds: cards.map((card) => card.id),
      answers: finalAnswers.map((answer) => ({ cardId: answer.cardId, userAnswer: answer.userAnswer, reactionTimeMs: answer.reactionTimeMs, position: answer.position })),
      remainingMs: Math.max(0, Math.round(finalRemaining)), startedAt: startedAt.current, finishedAt: new Date().toISOString(),
    }) }).then(async (response) => {
      const payload = await response.json().catch(() => null) as { data?: SavedResult } | null;
      if (!response.ok || !payload?.data) throw new Error("save_failed");
      setSaved(payload.data); setScore(payload.data.score); setBestCombo(payload.data.bestCombo); setSync("saved");
    }).catch(() => setSync("failed"));
  }, [cards, courseSlug, direction, lessonSlug, level, mode]);

  useEffect(() => {
    if (stage !== "countdown") return;
    const timer = window.setTimeout(() => {
      if (countdown > 0) setCountdown((current) => current - 1);
      else {
        const duration = cardReactionRules.levels[level].seconds * 1000;
        deadline.current = performance.now() + duration;
        setRemainingMs(duration); setStage("playing");
      }
    }, countdown > 0 ? 500 : 300);
    return () => window.clearTimeout(timer);
  }, [countdown, level, stage]);

  useEffect(() => {
    if (stage !== "playing") return;
    const timer = window.setInterval(() => {
      const next = Math.max(0, deadline.current - performance.now());
      setRemainingMs(next);
      if (next === 0) finish(answers, 0);
    }, 47);
    return () => window.clearInterval(timer);
  }, [answers, bestCombo, finish, stage]);

  function start(config: GameConfig = { level, direction, mode }) {
    const selectedRule = cardReactionRules.levels[config.level];
    if (vocabulary.length < selectedRule.cards) return;
    gameMusic.playFromUserGesture();
    setLevel(config.level); setDirection(config.direction); setMode(config.mode);
    const board = createCardReactionBoard({ vocabulary, level: config.level, direction: config.direction, progressById });
    setCards(board); setStates(Object.fromEntries(board.map((card) => [card.id, "hidden"]))); setActiveId(null);
    setAnswers([]); setWeakIds(new Set()); setLives(5); setCombo(0); setBestCombo(0); setScore(0); setSaved(null); setSync("idle");
    setCountdown(3); setStage("countdown"); finishing.current = false; attemptId.current = crypto.randomUUID(); startedAt.current = new Date().toISOString();
  }

  function quickStart() {
    start({ level: vocabulary.length >= 16 ? "medium" : "easy", direction: "mixed", mode: "choose" });
  }

  const reveal = useCallback((card: CardReactionCard) => {
    if (stage !== "playing" || activeId || states[card.id] !== "hidden") return;
    setStates((current) => ({ ...current, [card.id]: "revealed" })); setActiveId(card.id); setValue("");
    answerStartedAt.current = performance.now(); window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [activeId, stage, states]);

  const answer = useCallback((userAnswer: string) => {
    if (!activeCard || feedback) return;
    const reactionTimeMs = Math.round(performance.now() - answerStartedAt.current);
    const correct = isCorrectCardAnswer(userAnswer, activeCard);
    const revenge = correct && weakIds.has(activeCard.vocabularyId);
    const nextCombo = correct ? combo + 1 : 0;
    const nextLives = correct ? lives : lives - 1;
    const grade = gradeCardAnswer(mode, correct, reactionTimeMs);
    const points = scoreCardAnswer(level, grade, nextCombo, revenge);
    const nextAnswer: Answer = { cardId: activeCard.id, userAnswer: userAnswer.trim(), reactionTimeMs, position: answers.length + 1, correct, grade, points, revenge };
    const nextAnswers = [...answers, nextAnswer];
    setAnswers(nextAnswers); setCombo(nextCombo); setBestCombo((current) => Math.max(current, nextCombo)); setScore((current) => current + points);
    setFeedback({ correct, grade, points, revenge });
    if (sound) feedbackSound(correct ? "correct" : "wrong");
    if (!correct) { setLives(nextLives); setWeakIds((current) => new Set(current).add(activeCard.vocabularyId)); }
    else setStates((current) => ({ ...current, [activeCard.id]: "correct" }));
    window.setTimeout(() => {
      const nextCleared = cleared + (correct ? 1 : 0);
      setFeedback(null); setActiveId(null); setValue("");
      if (!correct) setStates((current) => ({ ...current, [activeCard.id]: "hidden" }));
      if (nextCleared === cards.length) { if (sound) feedbackSound("clear"); finish(nextAnswers, deadline.current - performance.now()); }
      else if (correct && nextCleared === cards.length - 1 && sound) feedbackSound("last");
      else if (nextLives <= 0) finish(nextAnswers, deadline.current - performance.now());
    }, 650);
  }, [activeCard, answers, cards.length, cleared, combo, feedback, finish, level, lives, mode, sound, weakIds]);

  if (stage === "setup") return <Setup vocabularyCount={vocabulary.length} lessonName={lessonName} level={level} setLevel={setLevel} direction={direction} setDirection={setDirection} mode={mode} setMode={setMode} sound={sound} setSound={setSound} backHref={backHref} onStart={() => start()} onQuickStart={quickStart} />;
  if (stage === "countdown") return <main className="grid min-h-dvh place-items-center bg-[#111827] text-center text-white"><GameMusicControl enabled={gameMusic.enabled} volume={gameMusic.volume} toggle={gameMusic.toggle} setVolume={gameMusic.setVolume} /><div><p className="font-black uppercase tracking-[.3em] text-fuchsia-300">Sẵn sàng dọn board?</p><b className="mt-5 block text-[9rem] leading-none">{countdown || "BẮT ĐẦU!"}</b></div></main>;
  if (stage === "result") return <Result lessonName={lessonName} level={level} cards={cards.length} cleared={saved?.clearedCards ?? cleared} remainingMs={remainingMs} score={saved?.score ?? score} accuracy={saved?.accuracy ?? (answers.length ? Math.round(answers.filter((a) => a.correct).length / answers.length * 100) : 0)} bestCombo={saved?.bestCombo ?? bestCombo} perfect={saved?.perfectCount ?? answers.filter((a) => a.grade === "perfect").length} wrong={saved?.wrongCount ?? answers.filter((a) => !a.correct).length} revenge={saved?.revengeCount ?? answers.filter((a) => a.revenge).length} weak={weakIds.size} saved={saved} sync={sync} onRetry={() => setStage("setup")} backHref={backHref} historyHref={`/speed-test/lich-su?sourceKind=lesson&sourceId=${encodeURIComponent(lessonId)}`} />;

  return <main className={`min-h-dvh px-3 py-4 text-white transition-colors sm:px-6 ${danger ? "bg-[radial-gradient(circle_at_top,#7f1d1d,#111827_58%)]" : "bg-[radial-gradient(circle_at_top,#312e81,#111827_55%)]"}`}><GameMusicControl enabled={gameMusic.enabled} volume={gameMusic.volume} toggle={gameMusic.toggle} setVolume={gameMusic.setVolume} /><section className="mx-auto max-w-6xl"><header className={`grid grid-cols-3 items-center gap-2 rounded-2xl p-4 font-black backdrop-blur ${danger ? "animate-pulse bg-red-500/20 ring-2 ring-red-400/50" : "bg-white/10"}`}><span>{Array.from({ length: 5 }, (_, i) => <span key={i}>{i < lives ? "❤️" : "🖤"}</span>)}</span><span className="text-center text-amber-300">🔥 {combo} COMBO</span><span className={`text-right font-mono ${remainingMs <= 10_000 ? "text-red-300" : "text-cyan-200"}`}>⏱ {formatCountdown(remainingMs)}</span></header><div className="mt-3 flex items-center gap-3"><div className="h-3 flex-1 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-gradient-to-r from-fuchsia-400 to-cyan-300 transition-all" style={{ width: `${cards.length ? cleared / cards.length * 100 : 0}%` }} /></div><b>{cleared}/{cards.length} thẻ</b></div>{remainingCards === 1 && <p className="mt-4 animate-bounce text-center text-xl font-black text-amber-300">⚠️ THẺ CUỐI CÙNG!</p>}<div className={`mx-auto mt-5 grid max-w-5xl gap-2 sm:gap-3 ${level === "easy" ? "grid-cols-3" : level === "medium" ? "grid-cols-4" : "grid-cols-5"}`}>{cards.map((card) => { const state = states[card.id]; return <button key={card.id} onClick={() => reveal(card)} disabled={Boolean(activeId) || state === "correct"} className={`card-reaction-card aspect-[3/4] min-w-0 rounded-xl border p-1 text-center shadow-xl transition duration-300 sm:rounded-2xl sm:p-2 ${state === "correct" ? "border-emerald-300 bg-emerald-400 text-emerald-950" : state === "revealed" ? "rotate-y-180 border-amber-300 bg-white text-slate-900" : remainingCards === 1 ? "animate-pulse border-amber-300 bg-gradient-to-br from-amber-500 to-red-600" : "border-fuchsia-300/30 bg-gradient-to-br from-violet-600 to-fuchsia-700 hover:-translate-y-1"}`}><span className={`grid h-full place-items-center overflow-hidden font-black ${state === "revealed" ? "[transform:rotateY(180deg)]" : ""} ${level === "hard" ? "text-sm sm:text-xl" : "text-lg sm:text-2xl"}`}>{state === "correct" ? <>✓<small className="block">{card.content}</small></> : state === "revealed" ? card.content : "🃏"}</span></button>; })}</div>{activeCard && <div className="fixed inset-0 z-50 grid place-items-center bg-black/65 p-4"><section className="relative w-full max-w-xl rounded-[2rem] bg-white p-6 text-center text-slate-900 shadow-2xl sm:p-8"><p className="text-xs font-black uppercase tracking-widest text-violet-600">{activeCard.direction === "ko_vi" ? "Hàn → Việt" : "Việt → Hàn"}</p><h1 className="mt-4 text-4xl font-black">{activeCard.content}</h1>{mode === "choose" ? <div className="mt-6 grid gap-3">{activeCard.options.map((option) => <button key={option} disabled={Boolean(feedback)} onClick={() => answer(option)} className="rounded-xl border-2 border-violet-100 bg-violet-50 p-3 text-left font-black hover:border-violet-400">{option}</button>)}</div> : <form onSubmit={(event) => { event.preventDefault(); if (value.trim()) answer(value); }} className="mt-6 flex gap-2"><input ref={inputRef} value={value} onChange={(event) => setValue(event.target.value)} disabled={Boolean(feedback)} className="min-w-0 flex-1 rounded-xl border-2 border-violet-200 px-4 font-bold outline-none focus:border-violet-500" placeholder="Nhập đáp án…" /><button disabled={!value.trim() || Boolean(feedback)} className="rounded-xl bg-violet-600 px-5 py-3 font-black text-white">TRẢ LỜI</button></form>}{feedback && <div className={`absolute inset-0 grid place-items-center rounded-[2rem] text-white ${feedback.correct ? "bg-emerald-600/95" : "bg-red-600/95"}`}><div><p className="text-4xl font-black">{feedback.revenge ? "⚡ REVENGE!" : feedback.correct ? `${feedback.grade === "perfect" ? "⚡ HOÀN HẢO" : "✓ CHÍNH XÁC"}` : "✕ SAI"}</p><p className="mt-2 text-xl font-black">{feedback.correct ? `+${feedback.points}` : "-1 ❤️ · Thẻ sẽ úp lại"}</p></div></div>}</section></div>}</section></main>;
}

function Setup({ vocabularyCount, lessonName, level, setLevel, direction, setDirection, mode, setMode, sound, setSound, backHref, onStart, onQuickStart }: { vocabularyCount: number; lessonName: string; level: CardReactionLevel; setLevel: (value: CardReactionLevel) => void; direction: CardReactionDirection; setDirection: (value: CardReactionDirection) => void; mode: CardReactionMode; setMode: (value: CardReactionMode) => void; sound: boolean; setSound: (value: boolean) => void; backHref: string; onStart: () => void; onQuickStart: () => void }) {
  const [customizing, setCustomizing] = useState(true);
  const rule = cardReactionRules.levels[level];
  if (!customizing) return <main className="grid min-h-dvh place-items-center bg-[radial-gradient(circle_at_top,#ede9fe,#c4b5fd)] px-4 py-8 text-slate-950"><section className="w-full max-w-2xl rounded-[2.5rem] bg-white/95 p-7 shadow-2xl sm:p-12"><Link href={backHref} className="font-black text-violet-700">← Về trang chủ</Link><p className="mt-8 font-black uppercase tracking-[.24em] text-violet-600">🃏 Card Reaction</p><h1 className="mt-2 text-4xl font-black sm:text-6xl">Dọn board nhanh nhất</h1><p className="mt-3 font-bold text-slate-500">{lessonName}</p><button onClick={onQuickStart} className="mt-8 w-full rounded-2xl border-2 border-amber-400 bg-gradient-to-r from-amber-200 to-yellow-300 p-5 text-left shadow-lg transition hover:-translate-y-1"><b className="block text-xl">⚡ CHƠI NHANH</b><span className="mt-1 block font-bold text-amber-950/70">{vocabularyCount >= 16 ? "4×4" : "3×3"} · Trộn hai chiều · Trắc nghiệm</span></button><button onClick={() => setCustomizing(true)} className="mt-3 w-full rounded-2xl border-2 border-violet-200 p-4 font-black text-violet-700 hover:bg-violet-50">⚙️ TÙY CHỈNH THỬ THÁCH</button><p className="mt-5 text-center text-sm font-semibold text-slate-400">Thiết lập gần nhất của bạn vẫn được ghi nhớ trên thiết bị này.</p></section></main>;
  return <main className="min-h-dvh bg-[radial-gradient(circle_at_top,#ede9fe,#c4b5fd)] px-4 py-6 text-slate-950 sm:py-10"><section className="mx-auto max-w-4xl"><Link href={backHref} className="rounded-2xl bg-white px-5 py-3 font-black shadow">← Về trang chủ</Link><div className="mt-6 rounded-[2rem] bg-white/95 p-6 shadow-2xl sm:p-10"><p className="font-black uppercase tracking-[.24em] text-violet-600">🃏 Card Reaction</p><h1 className="mt-2 text-4xl font-black sm:text-5xl">Dọn toàn bộ board</h1><p className="mt-2 font-bold text-slate-500">{lessonName}</p><h2 className="mt-7 font-black">ĐỘ KHÓ</h2><div className="mt-3 grid grid-cols-3 gap-2">{cardReactionLevels.map((item) => { const itemRule = cardReactionRules.levels[item]; const enabled = vocabularyCount >= itemRule.cards; return <button key={item} disabled={!enabled} onClick={() => setLevel(item)} className={`rounded-2xl border-2 p-3 font-black ${level === item && enabled ? "border-violet-500 bg-violet-100" : "border-slate-200 disabled:opacity-35"}`}><span className="block">{item === "easy" ? "🟢 Dễ" : item === "medium" ? "🟡 Vừa" : "🔴 Khó"}</span><small>{itemRule.size}×{itemRule.size} · {itemRule.seconds}s</small></button>; })}</div><h2 className="mt-6 font-black">CHIỀU TRẢ LỜI</h2><div className="mt-3 grid gap-2 sm:grid-cols-3">{[["ko_vi","🇰🇷 Hàn → Việt"],["vi_ko","🇻🇳 Việt → Hàn"],["mixed","🔀 Trộn hai chiều"]].map(([key,label]) => <button key={key} onClick={() => setDirection(key as CardReactionDirection)} className={`rounded-xl border-2 p-3 font-black ${direction === key ? "border-violet-500 bg-violet-100" : "border-slate-200"}`}>{label}</button>)}</div><h2 className="mt-6 font-black">CÁCH TRẢ LỜI</h2><div className="mt-3 grid grid-cols-2 gap-2"><button onClick={() => setMode("choose")} className={`rounded-xl border-2 p-3 font-black ${mode === "choose" ? "border-violet-500 bg-violet-100" : "border-slate-200"}`}>🎯 Trắc nghiệm ({rule.choices} đáp án)</button><button onClick={() => setMode("type")} className={`rounded-xl border-2 p-3 font-black ${mode === "type" ? "border-violet-500 bg-violet-100" : "border-slate-200"}`}>⌨️ Gõ đáp án</button></div><label className="mt-5 flex items-center justify-between rounded-xl bg-slate-50 p-4 font-bold"><span>🔔 Âm thanh hiệu ứng</span><input type="checkbox" checked={sound} onChange={(event) => setSound(event.target.checked)} className="h-5 w-5 accent-violet-600" /></label><button disabled={vocabularyCount < rule.cards} onClick={onStart} className="mt-7 w-full rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 p-4 text-xl font-black text-white shadow-lg disabled:opacity-40">BẮT ĐẦU · {rule.cards} THẺ</button></div></section></main>;
}

function Result({ lessonName, level, cards, cleared, remainingMs, score, accuracy, bestCombo, perfect, wrong, revenge, weak, saved, sync, onRetry, backHref, historyHref }: { lessonName: string; level: CardReactionLevel; cards: number; cleared: number; remainingMs: number; score: number; accuracy: number; bestCombo: number; perfect: number; wrong: number; revenge: number; weak: number; saved: SavedResult | null; sync: "idle" | "saving" | "saved" | "failed"; onRetry: () => void; backHref: string; historyHref: string }) {
  lessonName = `${lessonName} · ⚠️ ${weak} thẻ yếu · ⚡ ${revenge} Revenge`;
  const boardClear = cleared === cards;
  const elapsed = cardReactionRules.levels[level].seconds * 1000 - remainingMs;
  return <main className="min-h-dvh bg-[radial-gradient(circle_at_top,#312e81,#111827)] px-4 py-7 text-white"><section className="mx-auto max-w-3xl rounded-[2.5rem] border border-violet-300/20 bg-slate-950/85 p-6 text-center shadow-2xl sm:p-10"><p className="text-sm font-black uppercase tracking-[.25em] text-fuchsia-300">{boardClear ? "🎉 BOARD CLEAR!" : "🃏 GAME OVER"}</p><h1 className="mt-4 text-6xl font-black text-amber-300">{score.toLocaleString("vi-VN")}</h1><p className="font-black text-slate-400">ĐIỂM</p>{saved?.personalBest.fastestClear && <p className="mx-auto mt-4 w-fit rounded-full bg-amber-300 px-5 py-2 font-black text-amber-950">🏆 KỶ LỤC CLEAR MỚI</p>}<p className="mt-5 text-slate-400">{lessonName}</p><div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3">{[[`⏱ ${(elapsed / 1000).toFixed(2)}s`,"Thời gian"],[`${cleared}/${cards}`,"Thẻ đã clear"],[`🎯 ${accuracy}%`,"Độ chính xác"],[`🔥 ${bestCombo}`,"Combo cao nhất"],[`⚡ ${perfect}`,"Hoàn hảo"],[`✕ ${wrong}`,"Trả lời sai"]].map(([value,label]) => <div key={label} className="rounded-2xl bg-white/10 p-4 text-left"><b className="text-xl">{value}</b><span className="mt-1 block text-xs font-bold uppercase text-slate-400">{label}</span></div>)}</div><p className={`mt-5 text-sm font-bold ${sync === "failed" ? "text-red-300" : "text-slate-400"}`}>{sync === "saving" ? "Đang lưu kết quả…" : sync === "saved" ? "✓ Session, reaction time và weak card đã được lưu" : sync === "failed" ? "Không thể lưu kết quả vào database." : ""}</p><div className="mt-7 grid gap-3 sm:grid-cols-3"><button onClick={onRetry} className="rounded-2xl bg-amber-300 p-4 font-black text-amber-950">CHƠI LẠI</button><Link href={historyHref} className="rounded-2xl bg-violet-600 p-4 font-black">LỊCH SỬ</Link><Link href={backHref} className="rounded-2xl bg-white/10 p-4 font-black">THOÁT</Link></div></section></main>;
}
