"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

type Message = { from: "bot" | "user"; text: string };

const suggestions = ["입니다 dùng thế nào?", "Phân biệt 은 và 는", "Cho tôi 5 từ về nghề nghiệp"];

function answerFor(question: string) {
  const lower = question.toLowerCase();
  if (lower.includes("입니다") || lower.includes("là")) return "입니다 gắn sau danh từ để nói “là…”. Ví dụ mới: 저는 학생입니다. — Tôi là học sinh. Đây là cách nói lịch sự và trang trọng.";
  if (lower.includes("은") || lower.includes("는")) return "은/는 là tiểu từ chủ đề. Dùng 은 sau danh từ có phụ âm cuối, dùng 는 sau danh từ không có phụ âm cuối. Ví dụ: 이름은 수진입니다. 저는 베트남 사람입니다.";
  if (lower.includes("nghề") || lower.includes("từ vựng")) return "Một số từ về nghề nghiệp: 학생 (học sinh), 회사원 (nhân viên công ty), 의사 (bác sĩ), 교사 (giáo viên), 은행원 (nhân viên ngân hàng). Bạn muốn mình tạo bài luyện tập không?";
  return "Mình đang hỗ trợ nội dung Bài 1: giới thiệu bản thân, quốc gia, nghề nghiệp và ngữ pháp cơ bản. Bạn có thể hỏi về 입니다, 입니까?, 은/는 hoặc từ vựng nhé!";
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([{ from: "bot", text: "안녕하세요! Mình là Haru, trợ lý học tiếng Hàn của bạn. Hôm nay mình giúp bạn ôn phần nào?" }]);
  const [input, setInput] = useState("");

  function send(question = input) {
    const value = question.trim();
    if (!value) return;
    setMessages((items) => [...items, { from: "user", text: value }, { from: "bot", text: answerFor(value) }]);
    setInput("");
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    send();
  }

  return (
    <main className="elegant-blue min-h-screen text-[#10243e]">
      <header className="border-b border-[#10243e]/10 bg-white/80 backdrop-blur"><div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5"><Link href="/" className="text-lg font-black">Haru<span className="text-[#087eba]">topik</span></Link><Link href="/" className="font-bold text-[#10243e]/55">← Trang chủ</Link></div></header>
      <div className="mx-auto max-w-5xl px-5 py-10 md:px-8">
        <section className="overflow-hidden rounded-[2rem] border-2 border-[#10243e] bg-white shadow-[7px_8px_0_#10243e]">
          <div className="relative overflow-hidden bg-gradient-to-br from-[#087eba] to-[#63b8f2] px-7 py-8 text-white md:px-10"><div className="absolute -right-10 -top-16 h-48 w-48 rounded-full bg-white/15" /><div className="relative flex items-center gap-4"><div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-2xl font-black text-[#087eba] shadow-lg">하루</div><div><p className="text-sm font-bold uppercase tracking-widest text-white/75">Trợ lý học tập</p><h1 className="mt-1 text-3xl font-black">Haru AI</h1></div></div><p className="relative mt-6 max-w-xl text-white/85">Hỏi bất cứ điều gì về từ vựng và ngữ pháp. Mình sẽ giải thích ngắn gọn, dễ hiểu theo trình độ của bạn.</p></div>
          <div className="min-h-[390px] space-y-4 bg-[#f7fbff] p-5 md:p-8">{messages.map((message, index) => <div key={`${message.from}-${index}`} className={`flex ${message.from === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] rounded-2xl px-5 py-3 leading-7 ${message.from === "user" ? "rounded-br-sm bg-[#10243e] text-white" : "rounded-bl-sm border border-blue-100 bg-white text-[#10243e] shadow-sm"}`}>{message.text}</div></div>)}</div>
          <div className="border-t border-[#10243e]/10 bg-white p-5 md:p-6"><div className="mb-4 flex flex-wrap gap-2">{suggestions.map((suggestion) => <button key={suggestion} onClick={() => send(suggestion)} className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-bold text-blue-700 hover:bg-blue-100">{suggestion}</button>)}</div><form onSubmit={submit} className="flex gap-3"><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Hỏi Haru điều bạn đang thắc mắc…" className="min-w-0 flex-1 rounded-2xl border-2 border-[#10243e]/15 bg-[#f7fbff] px-5 py-3 outline-none focus:border-[#087eba]" /><button className="rounded-2xl bg-[#087eba] px-6 py-3 font-black text-white shadow-[3px_4px_0_#10243e] transition hover:-translate-y-0.5">Gửi ↑</button></form></div>
        </section>
        <p className="mt-5 text-center text-sm font-semibold text-[#10243e]/45">Haru hiện đang trả lời theo nội dung Bài 1 · Bạn có thể nâng cấp AI thật sau này.</p>
      </div>
    </main>
  );
}
