"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from "react";
import {
  calculateSpeedRating,
  classifySpeedTestAnswer,
  nextTimeAfterAnswer,
  selectAdaptiveSpeedTestQuestions,
  speedTestRules,
  type SpeedTestDirection,
  type SpeedTestVocabularySnapshot,
  type SpeedTestWordProgress,
} from "@/lib/speed-test/domain";

type SpeedList = { id: string; name: string; items: SpeedTestVocabularySnapshot[] };
type SpeedTestSource =
  | { kind: "list"; listId: string }
  | { kind: "lesson"; courseSlug: string; lessonSlug: string };
type Answer = {
  vocabularyId: string; userAnswer: string; responseTimeMs: number; position: number;
  timeBefore: number; timeAfter: number; result: "correct" | "near_miss" | "wrong";
};
type Stage = "setup" | "preview" | "countdown" | "playing" | "result";

export function SpeedTestExperience({ lists, initialListId, initialDailyMode = false, fixedSource, progressById = {}, backHref = "/tu-cua-toi", backLabel = "Về bộ từ", challengeDate, dailyCompletedToday = false, dailyBestAccuracy }: { lists: SpeedList[]; initialListId?: string; initialDailyMode?: boolean; fixedSource?: SpeedTestSource; progressById?: Record<string, SpeedTestWordProgress>; backHref?: string; backLabel?: string; challengeDate: string; dailyCompletedToday?: boolean; dailyBestAccuracy?: number }) {
  const [listId, setListId] = useState(lists.some((list) => list.id === initialListId) ? initialListId! : (lists[0]?.id ?? ""));
  const [direction, setDirection] = useState<SpeedTestDirection>("vi_ko");
  const [requested, setRequested] = useState<10 | 20 | 30 | "all">(initialDailyMode ? 20 : 30);
  const [dailyMode, setDailyMode] = useState(initialDailyMode);
  const [dailyCompleted, setDailyCompleted] = useState(dailyCompletedToday);
  const [stage, setStage] = useState<Stage>("setup");
  const [questions, setQuestions] = useState<SpeedTestVocabularySnapshot[]>([]);
  const [position, setPosition] = useState(0);
  const [value, setValue] = useState("");
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [remainingMs, setRemainingMs] = useState(speedTestRules.startingSeconds * 1000);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [feedback, setFeedback] = useState<null | { result: "correct" | "near_miss" | "wrong"; expected: string; delta: number }>(null);
  const [countdown, setCountdown] = useState(3);
  const [attemptId, setAttemptId] = useState("");
  const [startedAt, setStartedAt] = useState("");
  const [finishReason, setFinishReason] = useState<"completed" | "timed_out">("completed");
  const [syncState, setSyncState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const questionStartedAt = useRef(0);
  const lastTick = useRef(0);
  const finishing = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeList = lists.find((list) => list.id === listId) ?? null;
  const question = questions[position];
  const hasLearningData = Object.keys(progressById).length > 0;

  const selectQuestions = useCallback((items: readonly SpeedTestVocabularySnapshot[]) =>
    selectAdaptiveSpeedTestQuestions(items, dailyMode ? 20 : requested, progressById),
  [dailyMode, progressById, requested]);

  const finish = useCallback((reason: "completed" | "timed_out", finalAnswers = answers, finalSeconds = Math.max(0, Math.ceil(remainingMs / 1000)), finalBest = bestCombo) => {
    if (finishing.current) return;
    finishing.current = true; setFinishReason(reason); setStage("result"); setSyncState("saving");
    void fetch("/api/v1/speed-tests", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
      attemptId, source: fixedSource ?? { kind: "list", listId }, direction, requestedQuestionCount: dailyMode ? 20 : requested, questionIds: questions.map((item) => item.id),
      answers: finalAnswers.map((answer) => ({ vocabularyId: answer.vocabularyId, userAnswer: answer.userAnswer, responseTimeMs: answer.responseTimeMs, position: answer.position, timeBefore: answer.timeBefore, timeAfter: answer.timeAfter })), startingSeconds: speedTestRules.startingSeconds,
      remainingSeconds: finalSeconds, bestCombo: finalBest, finishedReason: reason, dailyChallenge: dailyMode, challengeDate: dailyMode ? challengeDate : undefined, startedAt, finishedAt: new Date().toISOString(),
    }) }).then((response) => {
      setSyncState(response.ok ? "saved" : "failed");
      if (response.ok && dailyMode && reason === "completed") setDailyCompleted(true);
    }).catch(() => setSyncState("failed"));
  }, [answers, attemptId, bestCombo, challengeDate, dailyMode, direction, fixedSource, listId, questions, remainingMs, requested, startedAt]);

  useEffect(() => {
    if (stage !== "countdown") return;
    if (countdown === 0) {
      const timer = window.setTimeout(() => {
        lastTick.current = performance.now(); questionStartedAt.current = performance.now(); setStage("playing");
      }, 250);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => setCountdown((current) => current - 1), 700);
    return () => window.clearTimeout(timer);
  }, [countdown, stage]);

  useEffect(() => {
    if (stage !== "playing" || feedback) return;
    lastTick.current = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now(); const elapsed = now - lastTick.current; lastTick.current = now;
      setRemainingMs((current) => Math.max(0, current - elapsed));
    }, 100);
    return () => window.clearInterval(timer);
  }, [feedback, stage]);

  useEffect(() => {
    if (stage === "playing" && remainingMs <= 0 && !finishing.current) finish("timed_out");
  }, [finish, remainingMs, stage]);

  useEffect(() => { if (stage === "playing" && !feedback) inputRef.current?.focus(); }, [feedback, position, stage]);

  function prepare() {
    if (!activeList) return;
    setQuestions(selectQuestions(activeList.items)); setStage("preview");
  }
  function start(nextQuestions = questions) {
    const selected = nextQuestions.length ? nextQuestions : selectQuestions(activeList?.items ?? []);
    setQuestions(selected); setPosition(0); setAnswers([]); setValue(""); setRemainingMs(speedTestRules.startingSeconds * 1000);
    setCombo(0); setBestCombo(0); setFeedback(null); setCountdown(3); setAttemptId(crypto.randomUUID());
    setStartedAt(new Date().toISOString()); setSyncState("idle"); finishing.current = false; setStage("countdown");
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!question || feedback || !value.trim()) return;
    const result = classifySpeedTestAnswer(value, question, direction);
    const correct = result === "correct";
    const nextCombo = correct ? combo + 1 : 0;
    const before = Math.max(0, Math.ceil(remainingMs / 1000));
    const after = nextTimeAfterAnswer({ currentSeconds: before, correct, nextCombo });
    const expected = direction === "vi_ko" ? question.korean : question.vietnamese;
    const delta = after - before;
    const nextAnswer: Answer = { vocabularyId: question.id, userAnswer: value.trim(), responseTimeMs: Math.round(performance.now() - questionStartedAt.current), position: position + 1, timeBefore: before, timeAfter: after, result };
    const nextAnswers = [...answers, nextAnswer];
    setAnswers(nextAnswers); setCombo(nextCombo); setBestCombo((current) => Math.max(current, nextCombo));
    setRemainingMs(after * 1000); setFeedback({ result, expected, delta });
    window.setTimeout(() => {
      setFeedback(null); setValue("");
      if (position + 1 >= questions.length) finish("completed", nextAnswers, after, Math.max(bestCombo, nextCombo));
      else { setPosition((current) => current + 1); questionStartedAt.current = performance.now(); lastTick.current = performance.now(); }
    }, speedTestRules.feedbackDelayMs);
  }
  const correctCount = answers.filter((answer) => answer.result === "correct").length;
  const nearMissCount = answers.filter((answer) => answer.result === "near_miss").length;
  const accuracy = answers.length ? Math.round((correctCount / answers.length) * 100) : 0;
  const wrongItems = useMemo(() => answers.filter((answer) => answer.result !== "correct").map((answer) => questions.find((item) => item.id === answer.vocabularyId)).filter(Boolean) as SpeedTestVocabularySnapshot[], [answers, questions]);
  const completed = finishReason === "completed";
  const historyHref = `/speed-test/lich-su?sourceKind=${fixedSource?.kind ?? "list"}&sourceId=${encodeURIComponent(activeList?.id ?? listId)}`;

  if (!lists.length) return <EmptyState />;
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#79d7f5,transparent_36rem),linear-gradient(145deg,#0b87c4,#075397)] px-4 py-6 sm:px-6 sm:py-10">
      <section className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="rounded-2xl bg-white/85 px-5 py-3 font-black text-ink-900 shadow-lg">← Trang chủ</Link>
          <span className="rounded-full bg-[#10243e] px-4 py-2 text-sm font-black tracking-wider text-white">⚡ SPEED TEST</span>
        </div>

        {stage === "setup" && <Setup lists={lists} listId={listId} setListId={setListId} direction={direction} setDirection={setDirection} requested={requested} setRequested={setRequested} dailyMode={dailyMode} setDailyMode={setDailyMode} dailyCompletedToday={dailyCompleted} dailyBestAccuracy={dailyBestAccuracy} activeList={activeList} onNext={prepare} lockList={Boolean(fixedSource)} />}
        {stage === "preview" && activeList && <Preview list={activeList} direction={direction} count={questions.length} adaptive={hasLearningData} dailyMode={dailyMode} dailyCompletedToday={dailyCompleted} onBack={() => setStage("setup")} onStart={() => start()} />}
        {stage === "countdown" && <div className="mt-16 text-center text-white"><p className="text-xl font-black uppercase tracking-[.25em]">Sẵn sàng</p><p className="mt-6 text-[10rem] font-black leading-none drop-shadow-xl">{countdown || "GO!"}</p></div>}
        {stage === "playing" && question && <Game question={question} direction={direction} value={value} setValue={setValue} inputRef={inputRef} submit={submit} remaining={Math.ceil(remainingMs / 1000)} combo={combo} position={position} total={questions.length} feedback={feedback} />}
        {stage === "result" && <Result completed={completed} total={questions.length} answered={answers.length} correct={correctCount} nearMiss={nearMissCount} accuracy={accuracy} bestCombo={bestCombo} remaining={Math.max(0, Math.ceil(remainingMs / 1000))} rating={calculateSpeedRating({ accuracy, completed })} wrongItems={wrongItems} syncState={syncState} dailyMode={dailyMode} dailyCompletedToday={dailyCompletedToday} onRetry={() => start(selectQuestions(activeList?.items ?? []))} onReview={() => { setDailyMode(false); start(wrongItems); }} backHref={backHref} backLabel={backLabel} historyHref={historyHref} />}
      </section>
    </main>
  );
}

type SetupProps = { lists: SpeedList[]; listId: string; setListId: Dispatch<SetStateAction<string>>; direction: SpeedTestDirection; setDirection: Dispatch<SetStateAction<SpeedTestDirection>>; requested: 10 | 20 | 30 | "all"; setRequested: Dispatch<SetStateAction<10 | 20 | 30 | "all">>; dailyMode: boolean; setDailyMode: Dispatch<SetStateAction<boolean>>; dailyCompletedToday: boolean; dailyBestAccuracy?: number; activeList: SpeedList | null; onNext: () => void; lockList: boolean };
function Setup({ lists, listId, setListId, direction, setDirection, requested, setRequested, dailyMode, setDailyMode, dailyCompletedToday, dailyBestAccuracy, activeList, onNext, lockList }: SetupProps) {
  return <section className="mt-8 overflow-hidden rounded-[2rem] border border-white/70 bg-white/95 p-6 shadow-2xl sm:p-10">
    <p className="font-black uppercase tracking-[.2em] text-brand-600">Thiết lập nhanh</p><h1 className="mt-2 text-4xl font-black text-ink-900 sm:text-5xl">Kiểm tra tốc độ nhớ từ</h1><p className="mt-3 text-ink-600">Chọn bộ từ, chiều trả lời và số câu. Đồng hồ bắt đầu sau màn xem trước.</p>
    <button type="button" onClick={() => { setDailyMode(true); setRequested(20); }} className={`mt-7 w-full rounded-3xl border-2 p-5 text-left transition ${dailyMode ? "border-amber-400 bg-gradient-to-r from-amber-50 to-orange-50 shadow-lg" : "border-amber-200 bg-amber-50/60 hover:border-amber-400"}`}><span className="flex flex-wrap items-center justify-between gap-3"><span><b className="block text-xl text-ink-900">📅 Daily Speed Test · 20 từ</b><span className="mt-1 block text-sm font-semibold text-ink-600">Hoàn thành một lần để giữ streak hôm nay. Làm lại vẫn cập nhật kỷ lục.</span></span><span className={`rounded-full px-4 py-2 text-sm font-black ${dailyCompletedToday ? "bg-emerald-100 text-emerald-800" : "bg-amber-200 text-amber-900"}`}>{dailyCompletedToday ? `✓ Đã hoàn thành${dailyBestAccuracy === undefined ? "" : ` · Best ${dailyBestAccuracy}%`}` : "Chưa hoàn thành"}</span></span></button>
    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      <Field label={lockList ? "Từ vựng của bài" : "Bộ từ"}><select disabled={lockList} value={listId} onChange={(e) => setListId(e.target.value)} className="w-full rounded-2xl border-2 border-sky-100 bg-white px-5 py-3.5 font-black text-ink-900 outline-none focus:border-brand-500 disabled:cursor-default disabled:bg-sky-50"><>{lists.map((list: SpeedList) => <option key={list.id} value={list.id}>{list.name} · {list.items.length} từ</option>)}</></select></Field>
      <Field label="Số câu"><div className="grid grid-cols-4 gap-2">{([10,20,30,"all"] as const).map((count) => <button type="button" disabled={dailyMode} key={count} onClick={() => { setDailyMode(false); setRequested(count); }} className={`rounded-xl px-3 py-3 font-black disabled:cursor-not-allowed ${requested === count ? "bg-brand-600 text-white" : "bg-sky-50 text-brand-700"}`}>{count === "all" ? "Tất cả" : count}</button>)}</div>{dailyMode && <button type="button" onClick={() => setDailyMode(false)} className="mt-2 text-sm font-black text-brand-700">Chuyển sang Speed Test thường</button>}</Field>
    </div>
    <p className="mt-7 text-sm font-black uppercase tracking-wider text-ink-600">Chế độ</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{(["vi_ko","ko_vi"] as const).map((mode) => <button type="button" key={mode} onClick={() => setDirection(mode)} className={`rounded-2xl border-2 p-5 text-left transition ${direction === mode ? "border-brand-600 bg-sky-50 shadow-md" : "border-slate-200"}`}><b className="text-xl text-ink-900">{mode === "vi_ko" ? "🇻🇳 → 🇰🇷" : "🇰🇷 → 🇻🇳"}</b><span className="mt-1 block text-sm text-ink-600">{mode === "vi_ko" ? "Nhìn nghĩa, gõ tiếng Hàn" : "Nhìn tiếng Hàn, gõ nghĩa Việt"}</span></button>)}</div>
    <button type="button" disabled={!activeList?.items.length} onClick={onNext} className="mt-8 w-full rounded-2xl bg-[#10243e] px-6 py-4 text-lg font-black text-white shadow-xl disabled:opacity-50">Xem trước →</button>
  </section>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label><span className="mb-2 block text-sm font-black text-ink-700">{label}</span>{children}</label>; }
function Preview({ list, direction, count, adaptive, dailyMode, dailyCompletedToday, onBack, onStart }: { list: SpeedList; direction: SpeedTestDirection; count: number; adaptive: boolean; dailyMode: boolean; dailyCompletedToday: boolean; onBack: () => void; onStart: () => void }) { const sample = list.items[0]; return <section className="mt-8 rounded-[2rem] bg-white/95 p-7 shadow-2xl sm:p-10"><button onClick={onBack} className="font-black text-brand-700">← Chỉnh thiết lập</button><div className="mt-7 grid gap-6 lg:grid-cols-[1fr_.8fr]"><div><p className="text-sm font-black uppercase tracking-[.18em] text-brand-600">{dailyMode ? "📅 Daily Challenge" : list.name}</p><h1 className="mt-2 text-4xl font-black text-ink-900">{count} câu · 60 giây</h1>{dailyMode && <p className="mt-3 inline-flex rounded-full bg-emerald-100 px-4 py-2 text-sm font-black text-emerald-800">{dailyCompletedToday ? "Lượt làm lại chỉ cập nhật kỷ lục" : "Hoàn thành để giữ streak hôm nay"}</p>}{adaptive && <p className="mt-3 ml-2 inline-flex rounded-full bg-amber-100 px-4 py-2 text-sm font-black text-amber-800">🧠 Adaptive · Đã xen kẽ từ yếu và từ từng sai</p>}<ul className="mt-5 space-y-3 font-semibold text-ink-600"><li>✓ Đúng +2 giây, sai -1 giây</li><li>✓ Combo 5 và 10 có thưởng thời gian</li><li>✓ Thời gian tối đa 120 giây</li><li>✓ Nhấn Enter để trả lời, tự chuyển câu</li></ul></div><div className="rounded-3xl bg-gradient-to-br from-sky-50 to-cyan-100 p-6 text-center"><p className="text-sm font-black text-brand-700">Ví dụ</p><p className="mt-5 text-3xl font-black text-ink-900">{direction === "vi_ko" ? sample?.vietnamese : sample?.korean}</p><div className="mt-5 rounded-xl bg-white px-4 py-3 text-slate-400">Nhập {direction === "vi_ko" ? "tiếng Hàn" : "tiếng Việt"}...</div></div></div><button onClick={onStart} className="mt-8 w-full rounded-2xl bg-emerald-600 px-6 py-4 text-xl font-black text-white shadow-xl">{dailyMode ? "Bắt đầu Daily Challenge 📅" : "Bắt đầu Speed Test ⚡"}</button></section>; }
type GameProps = { question: SpeedTestVocabularySnapshot; direction: SpeedTestDirection; value: string; setValue: Dispatch<SetStateAction<string>>; inputRef: RefObject<HTMLInputElement | null>; submit: (event: FormEvent) => void; remaining: number; combo: number; position: number; total: number; feedback: null | { result: "correct" | "near_miss" | "wrong"; expected: string; delta: number } };
function Game({ question, direction, value, setValue, inputRef, submit, remaining, combo, position, total, feedback }: GameProps) {
  const feedbackTone = feedback?.result === "correct"
    ? "border-emerald-500 bg-emerald-50 shadow-[0_0_0_8px_rgba(16,185,129,.12),0_18px_40px_rgba(16,185,129,.2)]"
    : feedback?.result === "near_miss"
      ? "border-amber-400 bg-amber-50 shadow-[0_0_0_8px_rgba(245,158,11,.1)]"
      : "border-red-500 bg-red-50 shadow-[0_0_0_8px_rgba(239,68,68,.1)]";
  const feedbackClass = feedback?.result === "correct"
    ? "speed-feedback-correct"
    : feedback?.result === "near_miss"
      ? "speed-feedback-near"
      : feedback
        ? "speed-feedback-wrong"
        : "";

  return <section className={`relative mx-auto mt-8 max-w-4xl overflow-hidden rounded-[2.5rem] border border-white/70 bg-white/95 p-6 text-center shadow-2xl sm:p-10 ${feedbackClass}`}>
    {feedback && <div aria-hidden="true" className={`speed-feedback-wash ${feedback.result}`} />}
    {feedback?.result === "correct" && <div aria-hidden="true" className="speed-success-sparks"><i /><i /><i /><i /><i /><i /></div>}
    <div className="relative z-10 flex items-center justify-between"><b className={`rounded-full bg-amber-100 px-4 py-2 text-xl text-amber-800 ${feedback?.delta ? "speed-time-pop" : ""}`}>⚡ {remaining}s</b><b className="rounded-full bg-orange-100 px-4 py-2 text-orange-700">🔥 COMBO {combo}</b></div>
    <p className="relative z-10 mt-12 text-sm font-black uppercase tracking-[.24em] text-brand-600">{direction === "vi_ko" ? "Gõ tiếng Hàn" : "Gõ nghĩa tiếng Việt"}</p>
    <h1 lang={direction === "ko_vi" ? "ko" : undefined} className="relative z-10 mt-5 text-5xl font-black text-ink-900 sm:text-7xl">{direction === "vi_ko" ? question.vietnamese : question.korean}</h1>
    <form onSubmit={submit} className="relative z-10 mx-auto mt-10 max-w-2xl"><input ref={inputRef} disabled={!!feedback} value={value} onChange={(e) => setValue(e.target.value)} autoComplete="off" className={`w-full rounded-2xl border-4 bg-white px-6 py-5 text-center text-2xl font-black outline-none transition ${feedback ? feedbackTone : "border-sky-200 focus:border-brand-600"}`} placeholder="Nhập đáp án rồi nhấn Enter" /></form>
    {feedback ? <div className={`speed-feedback-badge relative z-10 mx-auto mt-5 flex w-fit items-center gap-3 rounded-2xl px-5 py-3 text-xl font-black ${feedback.result === "correct" ? "bg-emerald-100 text-emerald-700" : feedback.result === "near_miss" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}><span className="grid h-9 w-9 place-items-center rounded-full bg-white/80 text-2xl shadow-sm">{feedback.result === "correct" ? "✓" : feedback.result === "near_miss" ? "△" : "×"}</span><span>{feedback.result === "correct" ? `Chính xác ${feedback.delta > 0 ? `· +${feedback.delta}s` : ""}` : feedback.result === "near_miss" ? `Gần đúng · Đáp án: ${feedback.expected} · ${feedback.delta}s` : `Chưa đúng · Đáp án: ${feedback.expected} · ${feedback.delta}s`}</span></div> : <p className="relative z-10 mt-5 text-sm font-bold text-ink-500">ENTER để trả lời</p>}
    <div className="relative z-10 mt-10 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-brand-600 transition-all" style={{ width: `${((position + 1) / total) * 100}%` }} /></div><p className="relative z-10 mt-3 font-black text-ink-600">{position + 1} / {total}</p>
  </section>;
}
type ResultProps = { completed: boolean; total: number; answered: number; correct: number; nearMiss: number; accuracy: number; bestCombo: number; remaining: number; rating: string; wrongItems: SpeedTestVocabularySnapshot[]; syncState: "idle" | "saving" | "saved" | "failed"; dailyMode: boolean; dailyCompletedToday: boolean; onRetry: () => void; onReview: () => void; backHref: string; backLabel: string; historyHref: string };
function Result({ completed, total, answered, correct, nearMiss, accuracy, bestCombo, remaining, rating, wrongItems, syncState, dailyMode, dailyCompletedToday, onRetry, onReview, backHref, backLabel, historyHref }: ResultProps) { return <section className="mt-8 rounded-[2rem] bg-white/95 p-6 shadow-2xl sm:p-10"><div className="text-center"><p className="text-7xl">{completed ? "🎉" : "⏰"}</p><h1 className="mt-4 text-4xl font-black text-ink-900">{completed ? "Hoàn thành!" : "Hết giờ — tiếp tục cố gắng nhé"}</h1>{dailyMode && completed && <p className="mx-auto mt-3 max-w-xl rounded-full bg-emerald-100 px-5 py-2 font-black text-emerald-800">{dailyCompletedToday ? "Kỷ lục Daily hôm nay đã được cập nhật" : "Daily Challenge đã được ghi nhận cho streak hôm nay"}</p>}<div className="mx-auto mt-5 grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-cyan-400 to-brand-700 text-4xl font-black text-white shadow-xl">{rating}</div></div><div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-6">{[[`${correct}/${answered}`,"Câu đúng"],[`${nearMiss}`,"Gần đúng"],[`${accuracy}%`,"Accuracy"],[`🔥 ${bestCombo}`,"Best combo"],[`${remaining}s`,"Còn lại"],[`${answered}/${total}`,"Đã làm"]].map(([metric,label]) => <div key={label} className="rounded-2xl bg-sky-50 p-4 text-center"><b className="text-2xl text-ink-900">{metric}</b><span className="mt-1 block text-sm font-bold text-ink-600">{label}</span></div>)}</div><p className={`mt-4 text-center text-sm font-bold ${syncState === "failed" ? "text-amber-700" : "text-ink-500"}`}>{syncState === "saving" ? "Đang lưu kết quả..." : syncState === "saved" ? "✓ Đã lưu kết quả và cập nhật từ yếu" : syncState === "failed" ? "Kết quả vẫn hiển thị, nhưng chưa đồng bộ được dữ liệu." : ""}</p>{wrongItems.length > 0 && <div className="mt-8"><h2 className="text-2xl font-black text-ink-900">Từ cần ôn lại</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{wrongItems.map((item) => <div key={item.id} className="rounded-2xl border border-red-100 bg-red-50/70 p-4"><b lang="ko" className="text-xl text-ink-900">{item.korean}</b><span className="mt-1 block text-ink-600">{item.vietnamese}</span></div>)}</div></div>}<div className="mt-8 flex flex-wrap justify-center gap-3"><button onClick={onRetry} className="rounded-xl bg-brand-600 px-5 py-3 font-black text-white">↻ Làm lại</button>{wrongItems.length > 0 && <button onClick={onReview} className="rounded-xl bg-amber-100 px-5 py-3 font-black text-amber-800">Ôn lại {wrongItems.length} từ cần nhớ</button>}<Link href={historyHref} className="rounded-xl bg-cyan-100 px-5 py-3 font-black text-cyan-800">Thành tích</Link><Link href={backHref} className="rounded-xl border border-slate-200 bg-white px-5 py-3 font-black text-ink-700">{backLabel}</Link><Link href="/" className="rounded-xl bg-[#10243e] px-5 py-3 font-black text-white">Trang chủ</Link></div></section>; }
function EmptyState() { return <main className="grid min-h-screen place-items-center bg-sky-100 p-5"><section className="max-w-lg rounded-[2rem] bg-white p-8 text-center shadow-xl"><span className="text-5xl">⚡</span><h1 className="mt-4 text-3xl font-black text-ink-900">Chưa có từ để kiểm tra</h1><p className="mt-3 text-ink-600">Hãy thêm từ vào một bộ từ cá nhân trước.</p><Link href="/tu-cua-toi" className="mt-6 inline-block rounded-xl bg-brand-600 px-5 py-3 font-black text-white">Mở bộ từ của tôi</Link></section></main>; }
