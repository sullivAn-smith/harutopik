"use client";

import { useEffect, useMemo, useState } from "react";
import type { GrammarListSummary } from "@/lib/grammar-lists/schema";

type Mode = "manage" | "quiz" | "match";
async function dataOf(response: Response) { const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error?.message ?? "Không thể hoàn tất thao tác."); return body.data; }
function shuffle<T>(items: T[], seed = Date.now()) {
  const result = [...items];
  let state = seed || 1;
  for (let index = result.length - 1; index > 0; index -= 1) {
    state = (state * 1664525 + 1013904223) % 4294967296;
    const target = Math.floor((state / 4294967296) * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

export function GrammarListsManager() {
  const [lists, setLists] = useState<GrammarListSummary[]>([]);
  const [activeId, setActiveId] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<Mode>("manage");
  const [round, setRound] = useState(0);
  const [practiceSeed, setPracticeSeed] = useState(0);
  const [practiceMessage, setPracticeMessage] = useState("");
  const [matched, setMatched] = useState<string[]>([]);
  const [picked, setPicked] = useState<{ side: "form" | "title"; id: string } | null>(null);
  const active = lists.find((list) => list.id === activeId) ?? lists[0];
  const items = useMemo(() => active?.items ?? [], [active]);

  async function load(preferred?: string) {
    try { const value = await dataOf(await fetch("/api/v1/grammar-lists?includeItems=true")); setLists(value); setActiveId((current) => (preferred ?? current) || value[0]?.id || ""); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Chưa thể tải bộ ngữ pháp."); }
  }
  useEffect(() => {
    let live = true;
    fetch("/api/v1/grammar-lists?includeItems=true").then(dataOf).then((value) => {
      if (!live) return;
      setLists(value); setActiveId(value[0]?.id ?? "");
    }).catch((error) => { if (live) setMessage(error instanceof Error ? error.message : "Chưa thể tải bộ ngữ pháp."); });
    return () => { live = false; };
  }, []);
  async function createList() {
    try { const created = await dataOf(await fetch("/api/v1/grammar-lists", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) })); setName(""); await load(created.id); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Chưa thể tạo bộ."); }
  }
  async function remove(grammarId: string) { if (!active) return; await fetch(`/api/v1/grammar-lists/${active.id}/items/${encodeURIComponent(grammarId)}`, { method: "DELETE" }); await load(active.id); }
  async function deleteList() { if (!active || active.kind !== "custom") return; if (!confirm("Xoá bộ ngữ pháp này?")) return; await fetch(`/api/v1/grammar-lists/${active.id}`, { method: "DELETE" }); await load(""); }

  const quizOrder = useMemo(() => shuffle(items, practiceSeed), [items, practiceSeed]);
  const quiz = quizOrder[round % Math.max(quizOrder.length, 1)];
  const quizOptions = useMemo(
    () => quiz ? shuffle([quiz.item.title, ...shuffle(items.filter((entry) => entry.grammarId !== quiz.grammarId).map((entry) => entry.item.title), practiceSeed + round + 17).slice(0, 3)], practiceSeed + round + 31) : [],
    [items, practiceSeed, quiz, round],
  );
  const matchForms = useMemo(() => shuffle(items, practiceSeed + 101), [items, practiceSeed]);
  const matchTitles = useMemo(() => shuffle(items, practiceSeed + 211), [items, practiceSeed]);
  function choose(side: "form" | "title", id: string) { if (!picked || picked.side === side) return setPicked({ side, id }); if (picked.id === id) setMatched((value) => [...value, id]); setPicked(null); }
  function openPractice(nextMode: Exclude<Mode, "manage">) {
    setMode(nextMode);
    setRound(0);
    setMatched([]);
    setPicked(null);
    setPracticeMessage("");
    setPracticeSeed((value) => value + 1);
  }
  function closePractice() {
    setMode("manage");
    setPracticeMessage("");
    setPicked(null);
  }

  return <div className="mt-8">
    <form onSubmit={(event) => { event.preventDefault(); void createList(); }} className="flex flex-col gap-3 rounded-3xl border border-sky-100 bg-gradient-to-r from-sky-50 to-cyan-50 p-4 shadow-inner sm:flex-row">
      <input value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={60} required placeholder="Ví dụ: Ngữ pháp TOPIK I" className="min-w-0 flex-1 rounded-2xl border-2 border-white bg-white px-5 py-3.5 font-semibold shadow-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-sky-100"/>
      <button className="rounded-2xl bg-brand-600 px-6 py-3.5 font-black text-white shadow-[0_10px_22px_rgba(8,126,186,.24)] transition hover:-translate-y-0.5 hover:bg-brand-700">+ Tạo bộ ngữ pháp</button>
    </form>
    {message && <p role="status" className="mt-4 text-sm font-bold text-ink-600">{message}</p>}
    <div className="mt-7 grid gap-7 lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="h-fit space-y-2 rounded-3xl border border-slate-100 bg-slate-50/80 p-3">{lists.map((list) => <button key={list.id} onClick={() => { setActiveId(list.id); setMode("manage"); }} className={`flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-left font-black transition ${active?.id === list.id ? "bg-gradient-to-r from-brand-600 to-cyan-600 text-white shadow-[0_8px_18px_rgba(8,126,186,.22)]" : "bg-white text-ink-900 ring-1 ring-slate-100 hover:bg-sky-50 hover:text-brand-700"}`}><span className="truncate">{list.kind === "favorites" ? "♥ " : ""}{list.name}</span><span className="ml-3 text-sm opacity-75">{list.itemCount}</span></button>)}</aside>
      <section className="min-w-0 rounded-3xl border border-slate-100 bg-white p-1 sm:p-5">{active && <>
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-black text-ink-900">{active.name}</h2><p className="mt-1 text-sm text-ink-600">{active.itemCount} ngữ pháp đã lưu</p>{items.length < 4 && <p className="mt-1 text-xs font-bold text-amber-700">Cần tối thiểu 4 ngữ pháp để bắt đầu ôn tập.</p>}</div><div className="flex flex-wrap gap-2"><button disabled={items.length < 4} onClick={() => openPractice("quiz")} className="rounded-xl bg-amber-100 px-4 py-2.5 font-black text-amber-800 disabled:cursor-not-allowed disabled:opacity-40">Trắc nghiệm</button><button disabled={items.length < 4} onClick={() => openPractice("match")} className="rounded-xl bg-emerald-600 px-4 py-2.5 font-black text-white disabled:cursor-not-allowed disabled:opacity-40">Nối từ</button>{active.kind === "custom" && <button onClick={() => void deleteList()} className="rounded-xl border border-red-200 bg-white px-4 py-2.5 font-bold text-red-600">Xoá bộ ngữ pháp</button>}</div></div>
        {!active.itemCount ? <div className="mt-6 rounded-3xl border-2 border-dashed border-slate-200 p-10 text-center"><p className="font-black text-ink-900">Bộ ngữ pháp này đang trống</p><p className="mt-2 text-sm text-ink-600">Mở một bài học và bấm ♡ cạnh cấu trúc bạn muốn lưu.</p></div> : <div className="mt-6 grid gap-4 sm:grid-cols-2">{items.map((entry) => <article key={entry.grammarId} className="group rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/60 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200"><div className="flex justify-between gap-3"><div><p lang="ko" className="font-korean text-2xl font-black text-ink-900">{entry.item.form}</p><p className="mt-1 font-bold text-orange-700">{entry.item.title}</p><p className="mt-2 text-sm text-ink-600">{entry.item.formula}</p></div><button onClick={() => void remove(entry.grammarId)} className="rounded-lg px-2 py-1 text-sm font-bold text-red-500 hover:bg-red-50" aria-label={`Bỏ ngữ pháp ${entry.item.form}`}>×</button></div></article>)}</div>}
      </>}</section>
    </div>
    {mode !== "manage" && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#071224]/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={mode === "quiz" ? "Ôn tập trắc nghiệm ngữ pháp" : "Ôn tập nối ngữ pháp"}>
      <button type="button" className="absolute inset-0 cursor-default" onClick={closePractice} aria-label="Đóng ôn tập" />
      <section className="relative flex max-h-[88vh] w-full max-w-[720px] flex-col overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-[0_28px_90px_rgba(7,18,36,.35)] sm:aspect-square">
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-7">
          <div><p className={`text-xs font-black tracking-[.16em] ${mode === "quiz" ? "text-amber-700" : "text-emerald-700"}`}>{mode === "quiz" ? "TRẮC NGHIỆM NGỮ PHÁP" : "NỐI NGỮ PHÁP VỚI NGHĨA"}</p><p className="mt-1 text-sm font-bold text-ink-600">{active?.name} · {items.length} ngữ pháp</p></div>
          <button type="button" onClick={closePractice} className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-xl font-black text-ink-700 transition hover:bg-slate-200" aria-label="Đóng">×</button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
          {mode === "quiz" && quiz && <div className="flex h-full flex-col justify-center"><p className="text-center text-sm font-bold text-ink-500">Chọn nghĩa đúng</p><h3 lang="ko" className="font-korean mt-3 text-center text-4xl font-black text-ink-900 sm:text-5xl">{quiz.item.form}</h3><div className="mt-7 grid gap-3 sm:grid-cols-2">{quizOptions.map((option, optionIndex) => <button key={`${round}-${optionIndex}-${option}`} onClick={() => { setPracticeMessage(option === quiz.item.title ? "✓ Chính xác" : `Chưa đúng. Đáp án: ${quiz.item.title}`); setRound((value) => value + 1); }} className="rounded-2xl border-2 border-slate-200 bg-white p-4 text-left font-bold transition hover:-translate-y-0.5 hover:border-amber-400 hover:bg-amber-50">{option}</button>)}</div>{practiceMessage && <p className="mt-5 text-center font-black text-brand-700">{practiceMessage}</p>}</div>}
          {mode === "match" && <div><div className="grid grid-cols-2 gap-3 sm:gap-5"><div className="space-y-2">{matchForms.filter((entry) => !matched.includes(entry.grammarId)).map((entry) => <button key={entry.grammarId} onClick={() => choose("form", entry.grammarId)} className={`block w-full rounded-xl border-2 p-3 font-black transition ${picked?.side === "form" && picked.id === entry.grammarId ? "border-violet-500 bg-violet-100" : "border-slate-200 hover:border-violet-300"}`}>{entry.item.form}</button>)}</div><div className="space-y-2">{matchTitles.filter((entry) => !matched.includes(entry.grammarId)).map((entry) => <button key={entry.grammarId} onClick={() => choose("title", entry.grammarId)} className={`block w-full rounded-xl border-2 p-3 font-bold transition ${picked?.side === "title" && picked.id === entry.grammarId ? "border-violet-500 bg-violet-100" : "border-slate-200 hover:border-violet-300"}`}>{entry.item.title}</button>)}</div></div>{matched.length === items.length && <div className="mt-6 text-center"><p className="text-xl font-black text-emerald-700">✓ Hoàn thành!</p><button type="button" onClick={() => openPractice("match")} className="mt-3 rounded-xl bg-emerald-600 px-5 py-2.5 font-black text-white">Ôn lại với thứ tự mới</button></div>}</div>}
        </div>
      </section>
    </div>}
  </div>;
}
