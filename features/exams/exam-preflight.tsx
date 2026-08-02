"use client";

import Image from "next/image";
import { useState } from "react";
import { startExam } from "./actions";

export function ExamPreflight({ examId, listeningMinutes, readingMinutes }: {
  examId: string; listeningMinutes: number; readingMinutes: number;
}) {
  const [agreed, setAgreed] = useState(false);
  const [speakerChecked, setSpeakerChecked] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  function testSpeaker() {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 440; gain.gain.value = 0.08;
    oscillator.connect(gain); gain.connect(context.destination); oscillator.start();
    oscillator.stop(context.currentTime + 0.35); setSpeakerChecked(true);
  }
  async function enterFullscreen() {
    if (document.fullscreenElement) { setFullscreen(true); return; }
    await document.documentElement.requestFullscreen(); setFullscreen(true);
  }
  return <div className="p-7 md:p-9">
    <div className="flex justify-center"><Image src="/harutopik-logo-key.png" alt="Chim cánh cụt Haru" width={72} height={72} /></div>
    <div className="mt-6 grid gap-4 sm:grid-cols-2"><div className="rounded-2xl bg-sky-50 p-5 text-center"><strong className="block text-3xl text-[#087eba]">{listeningMinutes}</strong><span className="font-bold text-slate-500">phút Nghe</span></div><div className="rounded-2xl bg-sky-50 p-5 text-center"><strong className="block text-3xl text-[#087eba]">{readingMinutes}</strong><span className="font-bold text-slate-500">phút Đọc</span></div></div>
    <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-5"><h2 className="font-black">Quy định trước khi bắt đầu</h2><ul className="mt-3 list-disc space-y-2 pl-5 font-semibold leading-7 text-slate-700"><li>Hoàn thành phần Nghe trước, sau đó mới đến phần Đọc.</li><li>Audio mỗi câu chỉ phát một lần; không thể tạm dừng hoặc tua.</li><li>Câu Nghe đã chuyển qua sẽ bị khóa; phần Đọc được chuyển câu và đánh dấu tự do.</li><li>Hệ thống tự động lưu đáp án và ghi nhận số lần rời cửa sổ thi.</li><li>Desktop hoặc laptop và chế độ toàn màn hình được khuyến nghị.</li></ul></div>
    <div className="mt-5 grid gap-3 sm:grid-cols-2"><button type="button" onClick={testSpeaker} className="w-full rounded-2xl border-2 border-sky-200 bg-white px-5 py-3 font-black text-sky-800">{speakerChecked ? "Đã phát âm thanh kiểm tra" : "Kiểm tra loa"}</button><button type="button" onClick={() => void enterFullscreen()} className="w-full rounded-2xl border-2 border-sky-200 bg-white px-5 py-3 font-black text-sky-800">{fullscreen ? "Đã bật toàn màn hình" : "Bật toàn màn hình"}</button></div>
    <label className="mt-5 flex items-start gap-3 rounded-2xl bg-slate-50 p-4 font-bold"><input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} className="mt-1 h-5 w-5" /><span>Tôi đã đọc quy định, kiểm tra thiết bị và sẵn sàng bắt đầu.</span></label>
    <form action={startExam} className="mt-5"><input type="hidden" name="examId" value={examId} /><button disabled={!agreed || !speakerChecked} className="w-full rounded-2xl bg-[#102b5c] px-6 py-4 text-lg font-black text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-40">Bắt đầu phần Nghe →</button></form>
  </div>;
}
