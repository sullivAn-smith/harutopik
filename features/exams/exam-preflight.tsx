"use client";

import Image from "next/image";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { examAttemptModeLabel, type ExamAttemptMode } from "@/lib/exams/attempt-mode";
import { startExam } from "./actions";

const modes: Array<{
  id: ExamAttemptMode;
  title: string;
  description: string;
  icon: string;
}> = [
  { id: "listening", title: "Chỉ thi Nghe", description: "Tập trung luyện toàn bộ câu nghe", icon: "◖" },
  { id: "reading", title: "Chỉ thi Đọc", description: "Tập trung luyện toàn bộ câu đọc", icon: "文" },
  { id: "full", title: "Thi mô phỏng", description: "Làm đầy đủ cả Nghe và Đọc", icon: "◎" },
];

function StartExamButton({ disabled, label }: { disabled: boolean; label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      aria-disabled={disabled || pending}
      className="w-full rounded-2xl bg-[#102b5c] px-6 py-4 text-lg font-black text-white shadow-lg transition hover:bg-[#173d70] disabled:cursor-wait disabled:opacity-40"
    >
      {pending ? "Đang chuẩn bị đề…" : label}
    </button>
  );
}

export function ExamPreflight({ examId, listeningMinutes, readingMinutes, activeAttempts = [] }: {
  examId: string;
  listeningMinutes: number;
  readingMinutes: number;
  activeAttempts?: Array<{ id: string; mode: ExamAttemptMode; expiresAt: string; section: string; position: number; answeredCount: number; totalQuestions: number }>;
}) {
  const [mode, setMode] = useState<ExamAttemptMode>("full");
  const [agreed, setAgreed] = useState(false);
  const [speakerChecked, setSpeakerChecked] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const needsSpeaker = mode !== "reading";
  const selectedMinutes = mode === "listening"
    ? listeningMinutes
    : mode === "reading"
      ? readingMinutes
      : listeningMinutes + readingMinutes;

  function testSpeaker() {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 440;
    gain.gain.value = 0.08;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.35);
    setSpeakerChecked(true);
  }

  async function enterFullscreen() {
    if (document.fullscreenElement) {
      setFullscreen(true);
      return;
    }
    await document.documentElement.requestFullscreen();
    setFullscreen(true);
  }

  const buttonLabel = mode === "listening"
    ? "Bắt đầu phần Nghe →"
    : mode === "reading"
      ? "Bắt đầu phần Đọc →"
      : "Bắt đầu thi mô phỏng →";
  const resumable = activeAttempts?.find((attempt) => attempt.mode === mode);

  return (
    <div className="p-7 md:p-9">
      <div className="flex justify-center">
        <span className="grid h-24 w-24 place-items-center rounded-[2rem] bg-cyan-50 ring-1 ring-cyan-100">
          <Image src="/haru-mascot-clean.png" alt="Chim cánh cụt Haru" width={88} height={88} className="h-20 w-20 object-contain" />
        </span>
      </div>

      <section className="mt-7">
        <div className="text-center">
          <p className="text-xs font-black uppercase tracking-[.2em] text-[#087eba]">Chọn cách luyện</p>
          <h2 className="mt-2 text-2xl font-black">Bạn muốn làm phần nào?</h2>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {modes.map((item) => {
            const selected = mode === item.id;
            const minutes = item.id === "listening"
              ? listeningMinutes
              : item.id === "reading"
                ? readingMinutes
                : listeningMinutes + readingMinutes;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setMode(item.id)}
                className={`rounded-2xl border-2 p-5 text-left transition ${selected
                  ? "border-[#087eba] bg-sky-100 shadow-[0_8px_20px_rgba(8,126,186,.16)]"
                  : "border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50"}`}
              >
                <span className={`grid h-10 w-10 place-items-center rounded-xl text-lg font-black ${selected ? "bg-[#087eba] text-white" : "bg-slate-100 text-slate-500"}`}>{item.icon}</span>
                <strong className="mt-4 block text-lg">{item.title}</strong>
                <span className="mt-1 block text-sm font-semibold leading-6 text-slate-500">{item.description}</span>
                <span className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-xs font-black text-[#087eba]">{minutes} phút</span>
              </button>
            );
          })}
        </div>
      </section>

      {resumable && (
        <section className="mt-6 rounded-3xl border-2 border-emerald-300 bg-emerald-50 p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[.18em] text-emerald-700">Bài đang làm dở · {examAttemptModeLabel(resumable.mode)}</p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black">Bạn đã làm {resumable.answeredCount}/{resumable.totalQuestions} câu</h2>
              <p className="mt-1 font-semibold text-slate-600">Đang ở phần {resumable.section === "reading" ? "Đọc" : "Nghe"}, câu {resumable.position} · thời gian vẫn đang tiếp tục chạy.</p>
            </div>
            <a href={`/luyen-de/${examId}/lam-bai?attempt=${resumable.id}`} className="rounded-2xl bg-emerald-600 px-6 py-3 font-black text-white shadow-sm transition hover:bg-emerald-700">Tiếp tục làm bài →</a>
          </div>
          <p className="mt-3 text-sm font-semibold text-emerald-800">Đáp án và tiến trình đã được giữ nguyên. Đồng hồ vẫn tiếp tục chạy trong thời gian bạn rời bài.</p>
        </section>
      )}

      <div className="mt-6 rounded-2xl bg-sky-50 p-5 text-center">
        <strong className="block text-3xl text-[#087eba]">{selectedMinutes}</strong>
        <span className="font-bold text-slate-500">phút cho chế độ đã chọn</span>
      </div>

      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <h2 className="font-black">Quy định trước khi bắt đầu</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 font-semibold leading-7 text-slate-700">
          <li>{mode === "full" ? "Bạn có thể chuyển tự do giữa phần Nghe và phần Đọc." : `Bạn chỉ làm và chỉ thấy câu hỏi phần ${mode === "listening" ? "Nghe" : "Đọc"}.`}</li>
          {mode !== "reading" && <li>Bạn có thể phát, tạm dừng, tua và nghe lại audio trong thời gian làm bài.</li>}
          <li>Đáp án được tự động lưu; bạn có thể đánh dấu câu để xem lại.</li>
          <li>Hệ thống ghi nhận số lần rời khỏi cửa sổ thi.</li>
          <li>Desktop hoặc laptop và chế độ toàn màn hình được khuyến nghị.</li>
        </ul>
      </div>

      <div className={`mt-5 grid gap-3 ${needsSpeaker ? "sm:grid-cols-2" : ""}`}>
        {needsSpeaker && (
          <button type="button" onClick={testSpeaker} className="w-full rounded-2xl border-2 border-sky-200 bg-white px-5 py-3 font-black text-sky-800">
            {speakerChecked ? "Đã kiểm tra loa" : "Kiểm tra loa"}
          </button>
        )}
        <button type="button" onClick={() => void enterFullscreen()} className="w-full rounded-2xl border-2 border-sky-200 bg-white px-5 py-3 font-black text-sky-800">
          {fullscreen ? "Đã bật toàn màn hình" : "Bật toàn màn hình"}
        </button>
      </div>

      <label className="mt-5 flex items-start gap-3 rounded-2xl bg-slate-50 p-4 font-bold">
        <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} className="mt-1 h-5 w-5" />
        <span>Tôi đã đọc quy định và sẵn sàng bắt đầu.</span>
      </label>

      <form action={startExam} className="mt-5">
        <input type="hidden" name="examId" value={examId} />
        <input type="hidden" name="attemptMode" value={mode} />
        <StartExamButton
          disabled={!agreed || (needsSpeaker && !speakerChecked)}
          label={resumable ? "Tiếp tục bài đang làm →" : buttonLabel}
        />
      </form>
    </div>
  );
}
