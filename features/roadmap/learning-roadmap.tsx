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

const beginnerSteps = [
  {
    number: "01",
    icon: "한",
    title: "Làm quen Hangul",
    description: "Học mặt chữ, ghép âm tiết và cách đọc trước khi vào giáo trình.",
    action: "Học bảng chữ cái",
    href: "/hangul",
    image: "/roadmap/haru-roadmap-hangul-transparent.webp",
    button: "from-violet-500 to-indigo-600",
    color: "border-indigo-200 bg-indigo-50 text-indigo-950",
  },
  {
    number: "02",
    icon: "📖",
    title: "Học từng bài giáo trình",
    description: "Đi theo thứ tự bài học, kết hợp từ vựng, ngữ pháp và bài tập trong bài.",
    action: "Bắt đầu Sơ cấp 1",
    href: "/courses/topik-1",
    image: "/roadmap/haru-roadmap-book-transparent.webp",
    button: "from-sky-400 to-blue-600",
    color: "border-sky-200 bg-sky-50 text-sky-950",
  },
  {
    number: "03",
    icon: "＋",
    title: "Giữ lại phần cần nhớ",
    description: "Trong lúc học, thêm những từ khó vào bộ riêng để ôn lại và không bị quên.",
    action: "Xem bộ từ của tôi",
    href: "/tu-cua-toi",
    image: "/roadmap/haru-roadmap-saved-words-transparent.webp",
    button: "from-emerald-400 to-teal-600",
    color: "border-emerald-200 bg-emerald-50 text-emerald-950",
  },
  {
    number: "04",
    icon: "⚡",
    title: "Tăng phản xạ",
    description: "Sau mỗi bài, dùng Audio Reaction, Flash Recall và Card Match để củng cố trí nhớ.",
    action: "Vào Speed Test",
    href: "/speed-test",
    image: "/roadmap/haru-roadmap-speed-test-transparent.webp",
    button: "from-amber-400 to-orange-500",
    color: "border-amber-200 bg-amber-50 text-amber-950",
  },
  {
    number: "05",
    icon: "✓",
    title: "Kiểm tra và quay lại",
    description: "Luyện đề theo chặng, xem từ yếu rồi quay lại bộ từ hoặc bài học cần ôn.",
    action: "Xem đề luyện tập",
    href: "/luyen-de",
    image: "/roadmap/haru-roadmap-exam-transparent.webp",
    button: "from-fuchsia-500 to-violet-600",
    color: "border-violet-200 bg-violet-50 text-violet-950",
  },
] as const;

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
  const [activeTab, setActiveTab] = useState<"features" | "roadmap">("roadmap");
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
    <main className="relative isolate h-dvh overflow-hidden bg-[radial-gradient(circle_at_top_left,#68d5ff_0%,#2cacec_42%,#168bd5_100%)] text-[#10243e]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden"><span className="absolute -left-28 top-1/3 h-72 w-72 rounded-full bg-white/25 blur-3xl" /><span className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-violet-400/25 blur-2xl" /><span className="absolute bottom-2 left-[8%] text-3xl text-white/65">✦</span><span className="absolute right-[5%] top-[18%] text-4xl text-white/65">✦</span></div>

      <div className="relative z-10 mx-auto grid h-full max-w-[1500px] grid-rows-[auto_minmax(0,1fr)] gap-2.5 px-3 py-3 sm:px-5 lg:gap-3 lg:px-8 lg:py-4">
        <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-1">
          <Link href="/" className="inline-flex w-fit items-center justify-self-start rounded-xl border border-white/80 bg-white/95 px-3 py-2 text-sm font-black shadow-md transition hover:-translate-x-1">← Trang chủ</Link>
          <div role="tablist" aria-label="Nội dung lộ trình" className="flex rounded-2xl border border-white/70 bg-white/25 p-1 shadow-sm backdrop-blur-md">
            <button type="button" role="tab" id="roadmap-tab" aria-controls="roadmap-panel" aria-selected={activeTab === "roadmap"} onClick={() => setActiveTab("roadmap")} className={`rounded-xl px-3 py-1.5 text-xs font-black transition sm:px-5 ${activeTab === "roadmap" ? "bg-white text-sky-700 shadow" : "text-white hover:bg-white/15"}`}>Lộ trình</button>
            <button type="button" role="tab" id="features-tab" aria-controls="features-panel" aria-selected={activeTab === "features"} onClick={() => setActiveTab("features")} className={`rounded-xl px-3 py-1.5 text-xs font-black transition sm:px-5 ${activeTab === "features" ? "bg-white text-sky-700 shadow" : "text-white hover:bg-white/15"}`}>Chức năng</button>
          </div>
          <div className="min-w-0 text-right"><p className="text-[10px] font-black uppercase tracking-[.24em] text-white/80">Haru Learning Path</p><h1 className="truncate text-lg font-black text-white drop-shadow sm:text-2xl">Lộ trình cho người mới</h1><p className="hidden text-[11px] font-bold text-sky-950/60 sm:block">Cùng Haru chinh phục tiếng Hàn mỗi ngày!</p></div>
        </header>

        {activeTab === "features" ? (
          <div id="features-panel" role="tabpanel" aria-labelledby="features-tab" className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-2.5 lg:gap-3">
            <section className="relative flex min-h-20 items-center overflow-hidden rounded-[1.7rem] border border-violet-300/70 bg-[linear-gradient(105deg,#5236d9_0%,#5548df_38%,#126fea_100%)] px-5 py-3 text-white shadow-[0_16px_38px_rgba(30,71,186,.3)] lg:min-h-24 lg:px-7" aria-labelledby="beginner-path-title">
              <span aria-hidden="true" className="absolute -right-12 -top-20 h-52 w-52 rounded-full bg-cyan-300/20 blur-xl" />
              <h2 id="beginner-path-title" className="relative pr-24 text-lg font-black drop-shadow sm:text-2xl lg:pr-48 lg:text-3xl">Một vòng học hoàn chỉnh</h2>
              <Image src="/roadmap/haru-roadmap-hero-transparent.webp" alt="Haru chào người học" width={180} height={190} sizes="(min-width: 1024px) 140px, 90px" className="absolute -bottom-9 right-0 h-auto w-24 object-contain drop-shadow-xl lg:-bottom-12 lg:right-3 lg:w-36" priority />
            </section>

            <ol className="grid min-h-0 grid-cols-2 items-start gap-2 lg:grid-cols-5 lg:gap-3" aria-label="Các chức năng trong vòng học">
              {beginnerSteps.map((step, index) => (
                <li key={step.number} className={`group relative flex min-h-0 flex-col overflow-hidden rounded-[1.7rem] border bg-gradient-to-b p-3 shadow-[0_12px_30px_rgba(21,70,130,.16)] transition hover:-translate-y-1 lg:p-4 ${step.color} ${index === beginnerSteps.length - 1 ? "col-span-2 lg:col-span-1" : ""}`}>
                  <div className="flex items-center justify-between gap-2"><b className={`grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br text-sm font-black text-white shadow-lg ${step.button}`}>{step.number}</b><span className="grid h-8 w-8 place-items-center rounded-xl bg-white/85 text-base shadow-sm lg:h-9 lg:w-9">{step.icon}</span></div>
                  <h3 className="mt-2 text-sm font-black leading-tight lg:mt-3 lg:text-lg">{step.title}</h3>
                  <p className="mt-1 line-clamp-3 text-[11px] font-semibold leading-4 opacity-70 lg:mt-2 lg:text-xs lg:leading-5 [@media(max-height:720px)]:line-clamp-2">{step.description}</p>
                  <div className="relative mt-2 h-[clamp(12rem,42dvh,24rem)] shrink-0 overflow-hidden rounded-2xl bg-white/20 [@media(max-height:650px)]:hidden"><span aria-hidden="true" className="absolute inset-x-2 bottom-1 h-1/2 rounded-full bg-white/45 blur-xl" /><Image src={step.image} alt="" fill sizes="(min-width: 1024px) 18vw, 42vw" className="object-contain object-bottom transition duration-300 group-hover:scale-105" /></div>
                  <Link href={step.href} className={`mt-2 flex min-h-8 items-center justify-center rounded-full bg-gradient-to-r px-2 text-center text-[10px] font-black text-white shadow-md transition hover:brightness-105 lg:text-xs ${step.button}`}>{step.action} →</Link>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <section id="roadmap-panel" role="tabpanel" aria-labelledby="roadmap-tab" aria-label="Chọn giáo trình tiếng Hàn" className="flex min-h-0 flex-col overflow-hidden rounded-[2rem] border border-white/80 bg-white/95 p-3 shadow-[0_20px_50px_rgba(18,87,145,.22)] sm:p-5 lg:p-7">
            <div className="flex items-end justify-between gap-4 border-b border-slate-200 pb-3 lg:pb-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.2em] text-sky-600">Lộ trình theo giáo trình</p>
                <h2 className="mt-1 text-xl font-black text-slate-900 sm:text-2xl">Chọn hướng học phù hợp với bạn</h2>
              </div>
              <p className="hidden max-w-md text-right text-xs font-semibold leading-5 text-slate-500 md:block">Mỗi lộ trình đã được chia theo cấp độ. Bạn chỉ cần chọn giáo trình và học lần lượt từ chặng đầu tiên.</p>
            </div>

            <div className="grid min-h-0 flex-1 gap-3 py-3 md:grid-cols-3 lg:gap-5 lg:py-5">
              {tracks.map((track, trackIndex) => {
                const colors = theme[track.accent as keyof typeof theme];
                return (
                  <article key={track.id} className={`flex min-h-0 flex-col overflow-hidden rounded-[1.6rem] border shadow-sm ${colors.soft}`}>
                    <div className={`flex items-center justify-between bg-gradient-to-r px-4 py-3 text-white ${colors.header}`}>
                      <div className="flex items-center gap-3"><b className="grid h-9 w-9 place-items-center rounded-full bg-white/20 text-sm">0{trackIndex + 1}</b><div><h3 className="font-black sm:text-lg">{track.title}</h3><p lang="ko" className="text-[10px] font-bold text-white/75">{track.koreanTitle}</p></div></div>
                      <button type="button" aria-label={`Tìm hiểu thêm về ${track.title}`} onClick={() => setSelected(track)} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/20 text-sm font-black transition hover:bg-white hover:text-slate-900">?</button>
                    </div>
                    <div className="flex min-h-0 flex-1 flex-col p-4">
                      <p className="text-xs font-black uppercase tracking-wide opacity-60">{track.subtitle}</p>
                      <p className="mt-1 hidden text-xs font-semibold leading-5 opacity-70 sm:block [@media(max-height:720px)]:hidden">{track.description}</p>
                      <ol className="mt-3 grid min-h-0 flex-1 touch-pan-y content-start gap-2 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label={`Các cấp độ của ${track.title}`}>
                        {track.levels.map((level, levelIndex) => (
                          <li key={level.title} className="flex items-center gap-2 rounded-xl border border-white/80 bg-white/70 px-3 py-2">
                            <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-black ${colors.icon}`}>{levelIndex + 1}</span>
                            <div className="min-w-0"><p className="truncate text-xs font-black">{level.title}</p><p className="hidden truncate text-[10px] font-semibold opacity-55 lg:block [@media(max-height:760px)]:hidden">{level.detail}</p></div>
                          </li>
                        ))}
                      </ol>
                      <Link href={track.href} className={`mt-3 flex min-h-9 items-center justify-center rounded-xl px-4 text-xs font-black text-white shadow-md transition hover:-translate-y-0.5 ${colors.button}`}>Bắt đầu học →</Link>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-3 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-2.5">
              <div className="min-w-0"><p className="text-xs font-black text-sky-950">Chưa biết chọn lộ trình nào?</p><p className="truncate text-[10px] font-semibold text-slate-500 sm:text-xs">Bắt đầu với Giáo trình tổng hợp Sơ cấp 1 — phù hợp người mới.</p></div>
              <Link href="/courses/topik-1" className="shrink-0 rounded-xl bg-sky-600 px-4 py-2 text-[10px] font-black text-white shadow transition hover:bg-sky-700 sm:text-xs">Học ngay →</Link>
            </div>
          </section>
        )}
      </div>

      {selected && selectedTheme && (
        <div className={`fixed inset-0 z-[100] grid place-items-center p-4 backdrop-blur-sm ${selectedTheme.overlay}`} onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="roadmap-dialog-title" className={`max-h-[88dvh] w-full max-w-3xl touch-pan-y overflow-y-auto overscroll-contain rounded-[2rem] border shadow-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${selectedTheme.modal}`}>
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
