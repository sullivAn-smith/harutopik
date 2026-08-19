"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type RoadmapTrack = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  href: string;
  accent: string;
  koreanTitle: string;
  levels: Array<{ title: string; detail: string; icon: string }>;
  details: Array<{ label: string; content: string }>;
};

const tracks: RoadmapTrack[] = [
  {
    id: "topik",
    title: "Giáo trình tổng hợp",
    subtitle: "Ôn thi theo cấp độ",
    description: "Lộ trình học tăng tốc 4 kỹ năng, chuẩn bị cho kỳ thi TOPIK.",
    href: "/thu-vien/1",
    accent: "blue",
    koreanTitle: "종합 한국어",
    levels: [
      { title: "Sơ cấp 1–2", detail: "Làm quen giao tiếp cơ bản, nền tảng vững chắc.", icon: "◉" },
      { title: "Trung cấp 1–2", detail: "Mở rộng vốn từ, nâng cao kỹ năng.", icon: "▥" },
      { title: "Cao cấp 1–2", detail: "Thành thạo, tự tin chinh phục mục tiêu TOPIK.", icon: "♜" },
    ],
    details: [
      { label: "Nguồn gốc", content: "Xuất bản lần đầu năm 2008, được biên soạn bởi các giáo sư ngôn ngữ Hàn Quốc trong dự án do Ngân hàng Kookmin và Quỹ Giao lưu Quốc tế Hàn Quốc tài trợ. Bản dành cho người Việt Nam được cập nhật nội dung và văn hóa, phát hành chính thức có bản quyền tại Việt Nam." },
      { label: "Ngôn ngữ & phương pháp sư phạm", content: "Toàn bộ phần giải thích từ vựng và ngữ pháp dùng tiếng Việt thuần, phù hợp người mới bắt đầu. Bộ sách gồm 6 quyển theo 3 cấp độ Sơ cấp, Trung cấp và Cao cấp; mỗi bài tích hợp nghe, nói, đọc, viết cùng tệp nghe đi kèm." },
      { label: "Yếu tố văn hóa", content: "Lồng ghép văn hóa Hàn Quốc với các tình huống giao tiếp đời sống và môi trường doanh nghiệp, giúp người học hiểu ngữ cảnh sử dụng ngôn ngữ." },
      { label: "Phù hợp với ai", content: "Người Việt mới bắt đầu từ con số 0, người tự học tại nhà và sinh viên cần một lộ trình quen thuộc, dễ theo dõi để học giao tiếp hoặc chuẩn bị TOPIK." },
    ],
  },
  {
    id: "seoul",
    title: "Giáo trình Seoul",
    subtitle: "Giao tiếp học thuật",
    description: "Học theo giáo trình Seoul, chú trọng giao tiếp và nền tảng học thuật.",
    href: "/thu-vien/2",
    accent: "green",
    koreanTitle: "서울대 한국어",
    levels: [
      { title: "1A–1B", detail: "Xây nền tảng từ căn bản đến giao tiếp.", icon: "☆" },
      { title: "2A–2B", detail: "Củng cố giao tiếp trong các tình huống quen thuộc.", icon: "☆" },
      { title: "3A–3B", detail: "Phát triển khả năng diễn đạt tự nhiên.", icon: "▣" },
      { title: "4A–4B", detail: "Mở rộng vốn từ và cấu trúc nâng cao.", icon: "▣" },
      { title: "5A–5B", detail: "Nâng cao năng lực học thuật và giao tiếp.", icon: "♜" },
      { title: "6A–6B", detail: "Hoàn thiện kỹ năng tiếng Hàn chuyên sâu.", icon: "♜" },
    ],
    details: [
      { label: "Nguồn gốc", content: "Do Viện Giáo dục Ngôn ngữ, Đại học Quốc gia Seoul trực tiếp biên soạn và xuất bản. Đây là giáo trình được sử dụng trong các lớp tiếng Hàn chính khóa tại trường." },
      { label: "Ngôn ngữ & phương pháp sư phạm", content: "Bản gốc dùng ngôn ngữ trung gian Anh – Hàn, cấu trúc 6 cấp độ từ 1 đến 6 và mỗi cấp chia thành hai quyển A, B. Kết hợp chặt chẽ giữa khẩu ngữ, viết và cân bằng bốn kỹ năng nghe, nói, đọc, viết." },
      { label: "Yếu tố văn hóa", content: "Nội dung xoay quanh đời sống thực tế tại Hàn Quốc; các phiên bản mới còn lồng ghép nội dung K-content như phim, nhạc và văn hóa đại chúng." },
      { label: "Phù hợp với ai", content: "Người học nghiêm túc có định hướng du học hoặc làm việc, người muốn lộ trình chia nhỏ bài bản và bám sát từng bước." },
    ],
  },
  {
    id: "sejong",
    title: "Giáo trình Sejong",
    subtitle: "Giao tiếp thực tế",
    description: "Học theo giáo trình Sejong, dành cho người nước ngoài học tiếng Hàn.",
    href: "/thu-vien/3",
    accent: "orange",
    koreanTitle: "세종한국어",
    levels: [
      { title: "Level 1–2", detail: "Khởi đầu vững chắc với ngôn ngữ cơ bản.", icon: "☆" },
      { title: "Level 3–4", detail: "Giao tiếp tự nhiên trong nhiều tình huống.", icon: "▣" },
      { title: "Level 5–6", detail: "Sử dụng ngôn ngữ linh hoạt trong công việc và học tập.", icon: "♙" },
      { title: "Level 7–8", detail: "Thành thạo ngữ pháp, diễn đạt chuyên sâu.", icon: "♛" },
    ],
    details: [
      { label: "Nguồn gốc", content: "Giáo trình tiêu chuẩn của Học viện Vua Sejong, mạng lưới trung tâm dạy tiếng Hàn và văn hóa Hàn Quốc thành lập từ năm 2007, hiện có mặt tại nhiều quốc gia." },
      { label: "Ngôn ngữ & phương pháp sư phạm", content: "Sách gốc viết hoàn toàn bằng tiếng Hàn, không kèm bản dịch. Bộ gồm 8 quyển từ sơ cấp đến cao cấp, tập trung mạnh vào hội thoại, luyện nghe và nói; có hướng dẫn viết nét chữ cùng hình ảnh minh họa trực quan." },
      { label: "Yếu tố văn hóa", content: "Mỗi bài lồng ghép văn hóa và xã hội Hàn Quốc với đời sống thực tế, giúp người học hiểu đúng bối cảnh sử dụng." },
      { label: "Phù hợp với ai", content: "Người học ở nước ngoài muốn tài liệu chuẩn quốc tế, người tự học ưu tiên phản xạ giao tiếp hơn văn phong học thuật." },
    ],
  },
];

const theme = {
  blue: {
    header: "bg-gradient-to-r from-blue-500 to-cyan-500",
    soft: "border-blue-100 bg-blue-50/85 text-blue-950",
    icon: "bg-blue-100 text-blue-700",
    button: "bg-blue-600 hover:bg-blue-700",
    modal: "border-blue-200 bg-blue-50",
    modalHeader: "from-blue-600 to-cyan-500",
    modalSection: "border-blue-100 bg-white text-blue-950",
    overlay: "bg-blue-950/55",
  },
  green: {
    header: "bg-gradient-to-r from-emerald-500 to-green-400",
    soft: "border-emerald-100 bg-emerald-50/85 text-emerald-950",
    icon: "bg-emerald-100 text-emerald-700",
    button: "bg-emerald-600 hover:bg-emerald-700",
    modal: "border-emerald-200 bg-emerald-50",
    modalHeader: "from-emerald-600 to-green-500",
    modalSection: "border-emerald-100 bg-white text-emerald-950",
    overlay: "bg-emerald-950/55",
  },
  orange: {
    header: "bg-gradient-to-r from-orange-400 to-amber-400",
    soft: "border-orange-100 bg-orange-50/85 text-orange-950",
    icon: "bg-orange-100 text-orange-700",
    button: "bg-orange-500 hover:bg-orange-600",
    modal: "border-orange-200 bg-orange-50",
    modalHeader: "from-orange-500 to-amber-400",
    modalSection: "border-orange-100 bg-white text-orange-950",
    overlay: "bg-orange-950/55",
  },
} as const;

export function LearningRoadmap() {
  const [selected, setSelected] = useState<RoadmapTrack | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const selectedTheme = selected
    ? theme[selected.accent as keyof typeof theme]
    : null;

  useEffect(() => {
    if (!selected) return;
    closeRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selected]);

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[linear-gradient(180deg,#28a8f2_0%,#38b4f3_38%,#83d7f5_72%,#e8faff_100%)] text-[#10243e]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <span className="absolute -left-32 top-[15%] h-72 w-72 rounded-full bg-white/22 blur-sm" />
        <span className="absolute -left-16 top-[22%] h-36 w-80 rounded-[50%] bg-white/24 blur-md" />
        <span className="absolute -right-36 top-[28%] h-80 w-80 rounded-full bg-white/24 blur-sm" />
        <span className="absolute -right-10 top-[35%] h-36 w-96 rounded-[50%] bg-white/22 blur-md" />
        <span className="absolute left-[4%] top-[10%] text-3xl text-white/70">✦</span>
        <span className="absolute right-[7%] top-[15%] text-4xl text-white/65">✦</span>
        <span className="absolute left-[2%] top-[55%] text-2xl text-cyan-50/85">◆</span>
        <span className="absolute right-[3%] top-[52%] text-3xl text-cyan-50/80">◆</span>
        <span className="absolute -bottom-44 -left-[12%] h-96 w-[72%] rotate-[-3deg] rounded-[50%] bg-white/78" />
        <span className="absolute -bottom-52 right-[-18%] h-[26rem] w-[78%] rotate-[4deg] rounded-[50%] bg-cyan-50/82" />
        <span className="absolute bottom-0 left-[12%] h-40 w-[76%] rounded-[50%] bg-white/38 blur-2xl" />
      </div>
      <div className="relative z-10 mx-auto max-w-6xl px-5 pb-12 pt-7 md:px-8 md:pb-16 md:pt-10">
        <Link href="/" className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-black shadow-lg transition hover:-translate-x-1">
          ← Trang chủ
        </Link>
        <Image src="/haru-mascot-clean.png" alt="Linh vật Harutopik" width={150} height={150} className="absolute right-5 top-3 h-auto w-24 object-contain drop-shadow-xl md:right-8 md:top-5 md:w-32" priority />

        <section className="relative mx-auto mt-12 max-w-6xl overflow-hidden rounded-[2rem] border border-violet-300 bg-gradient-to-r from-indigo-700 via-violet-700 to-purple-700 p-6 text-white shadow-[0_20px_48px_rgba(60,32,180,.3)] md:mt-16 md:p-7">
          <span aria-hidden="true" className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/8" />
          <div className="relative grid items-center gap-5 md:grid-cols-[auto_minmax(0,1fr)_auto]">
            <span aria-hidden="true" className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white/15 text-4xl shadow-inner md:mx-0">📚</span>
            <div className="text-center md:text-left">
              <h2 className="text-2xl font-black">Nhập môn tiếng Hàn (2–3 tuần)</h2>
              <p className="mt-1 text-sm font-bold text-indigo-100">Xây nền tảng vững chắc – Bắt đầu hành trình</p>
            </div>
            <Link href="/hangul" className="mx-auto rounded-xl bg-white px-5 py-3 font-black text-indigo-700 shadow-lg transition hover:-translate-y-0.5 md:mx-0">Học bảng chữ cái →</Link>
          </div>
          <div className="relative mt-5 grid gap-2 text-xs font-bold text-indigo-50 sm:grid-cols-2 lg:grid-cols-4">
            {["Bảng chữ cái Hangul", "Nguyên âm và phụ âm", "Ghép âm tiết", "Quy tắc biến âm cơ bản"].map((item, index) => <span key={item} className="rounded-full bg-white/10 px-4 py-3"><b className="mr-2 inline-grid h-6 w-6 place-items-center rounded-full bg-white text-indigo-700">{index + 1}</b>{item}</span>)}
          </div>
        </section>

        <div className="mx-auto hidden h-24 max-w-6xl lg:block" aria-label="Sơ đồ chia ba giáo trình">
          <svg viewBox="0 0 900 96" preserveAspectRatio="none" role="img" aria-hidden="true" className="h-full w-full overflow-visible drop-shadow-[0_3px_6px_rgba(16,36,62,.18)]">
            <path d="M450 2V34 M150 34H750" fill="none" stroke="#d8f6ff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M150 34V78 M450 34V78 M750 34V78" fill="none" stroke="#d8f6ff" strokeWidth="4" strokeLinecap="round" />
            <path d="M142 72L150 82L158 72 M442 72L450 82L458 72 M742 72L750 82L758 72" fill="none" stroke="#d8f6ff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <section className="mx-auto grid max-w-6xl items-start gap-5 lg:grid-cols-3" aria-label="Các giáo trình tiếng Hàn">
          {tracks.map((track) => {
            const colors = theme[track.accent as keyof typeof theme];
            return (
              <article key={track.id} className="group flex flex-col overflow-hidden rounded-[2rem] border border-white/90 bg-white/95 shadow-[0_20px_48px_rgba(5,72,128,.18)] backdrop-blur transition hover:-translate-y-1">
                <div className={`${colors.header} px-4 py-3.5 text-white`}>
                  <div className="flex min-h-12 items-center justify-center text-center">
                    <div className="flex min-w-0 flex-col items-center justify-center">
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-black">{track.title}</h2>
                        <button type="button" aria-label={`Tìm hiểu thêm về ${track.title}`} onClick={() => setSelected(track)} className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/70 bg-white/20 text-sm font-black transition hover:bg-white hover:text-[#10243e]">?</button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <div className={`grid gap-2.5 pb-4 ${track.id === "seoul" ? "sm:grid-cols-2 lg:grid-cols-2" : "grid-cols-1"}`}>
                    {track.levels.map((level) => <div key={level.title} className={`rounded-2xl border p-3 ${colors.soft}`}><div className="flex items-center gap-2.5"><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${colors.icon}`}>{level.icon}</span><h3 className="min-w-0 flex-1 font-black">{level.title}</h3><span aria-hidden="true" className="text-lg font-black opacity-45">›</span></div></div>)}
                  </div>
                  <Link href={track.href} className={`mt-auto flex w-full items-center justify-center rounded-2xl px-5 py-3 font-black text-white shadow-lg transition hover:-translate-y-0.5 ${colors.button}`}>Học ngay →</Link>
                </div>
              </article>
            );
          })}
        </section>

      </div>

      {selected && selectedTheme && (
        <div className={`fixed inset-0 z-[100] grid place-items-center p-4 backdrop-blur-sm ${selectedTheme.overlay}`} onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="roadmap-dialog-title" className={`max-h-[88dvh] w-full max-w-3xl overflow-y-auto rounded-[2rem] border shadow-2xl ${selectedTheme.modal}`}>
            <header className={`sticky top-0 z-10 flex items-start justify-between gap-4 bg-gradient-to-r px-6 py-5 text-white shadow-lg md:px-7 ${selectedTheme.modalHeader}`}>
              <div>
                <p className="text-xs font-black uppercase tracking-[.18em] text-white/75">Tìm hiểu thêm</p>
                <h2 id="roadmap-dialog-title" className="mt-1 text-2xl font-black md:text-3xl">{selected.title} <span lang="ko" className="text-white/80">({selected.koreanTitle})</span></h2>
              </div>
              <button ref={closeRef} type="button" aria-label="Đóng thông tin giáo trình" onClick={() => setSelected(null)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/20 text-xl font-black transition hover:bg-white hover:text-[#10243e]">×</button>
            </header>
            <div className="p-5 md:p-7">
              <p className="rounded-2xl bg-white/70 px-5 py-4 font-semibold leading-7 text-slate-600">{selected.description}</p>
              <div className="mt-5 space-y-3">
                {selected.details.map((detail) => (
                  <section key={detail.label} className={`rounded-2xl border p-5 shadow-sm ${selectedTheme.modalSection}`}>
                    <h3 className="font-black">{detail.label}</h3>
                    <p className="mt-2 text-sm font-semibold leading-7 text-slate-600">{detail.content}</p>
                  </section>
                ))}
              </div>
              <Link href={selected.href} className={`mt-6 flex w-full justify-center rounded-2xl px-5 py-3.5 font-black text-white shadow-lg transition hover:-translate-y-0.5 ${selectedTheme.button}`}>Học ngay →</Link>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
