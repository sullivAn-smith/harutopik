"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import type { VocabularyItem } from "@/content/schema";
import { FloatingLanguageKeyboard } from "@/features/lesson/components/floating-language-keyboard";
import type { RankedSpeedGame } from "@/lib/rankings/speed-ranking";
import type { SpeedTestWordProgress } from "@/lib/speed-test/domain";

type ArenaGame = "arena" | "typing" | "audio" | "flash" | "card";

const TypingSprint = dynamic(
  () => import("./speed-test-experience").then((module) => module.SpeedTestExperience),
  { loading: GameLoading },
);
const AudioReaction = dynamic(
  () => import("./audio-reaction-experience").then((module) => module.AudioReactionExperience),
  { loading: GameLoading },
);
const FlashRecall = dynamic(
  () => import("./flash-recall-experience").then((module) => module.FlashRecallExperience),
  { loading: GameLoading },
);
const CardReaction = dynamic(
  () => import("./card-reaction-experience").then((module) => module.CardReactionExperience),
  { loading: GameLoading },
);

type AudioLesson = {
  id: string;
  courseSlug: string;
  lessonSlug: string;
  name: string;
  audioCount?: number;
  completionPercent?: number;
  speedTestUnlocked?: boolean;
};

type LessonGameConfig = {
  vocabulary: VocabularyItem[];
  lessonName: string;
  lessonId: string;
  courseSlug: string;
  lessonSlug: string;
  progressById: Record<string, SpeedTestWordProgress>;
  challengeDate: string;
  dailyMode: boolean;
  dailyCompletedToday: boolean;
  dailyBestAccuracy?: number;
  rankedGame: RankedSpeedGame | null;
  rankedAttemptsRemaining: number;
  backHref: string;
};

export function SpeedTestArena({
  typingGame,
  audioGame,
  flashGame,
  cardGame,
  lessonGame,
  audioLessons = [],
  initialGame = "arena",
  typingDailyMode = false,
  backHref = "/",
}: {
  typingGame?: ReactNode;
  audioGame?: ReactNode;
  flashGame?: ReactNode;
  cardGame?: ReactNode;
  lessonGame?: LessonGameConfig;
  audioLessons?: AudioLesson[];
  initialGame?: ArenaGame;
  typingDailyMode?: boolean;
  backHref?: string;
}) {
  const [activeGame, setActiveGame] = useState<ArenaGame>(initialGame);
  const hasAudioGame = Boolean(audioGame || lessonGame);
  const hasFlashGame = Boolean(flashGame || lessonGame);
  const hasCardGame = Boolean(cardGame || lessonGame);

  if (activeGame === "typing" && typingGame) {
    return <ArenaGameShell activeGame={activeGame} setActiveGame={setActiveGame} hasAudioGame={hasAudioGame} hasFlashGame={hasFlashGame} hasCardGame={hasCardGame}>{typingGame}</ArenaGameShell>;
  }
  if (activeGame === "typing" && lessonGame) {
    return <ArenaGameShell activeGame={activeGame} setActiveGame={setActiveGame} hasAudioGame={hasAudioGame} hasFlashGame={hasFlashGame} hasCardGame={hasCardGame}>
      <TypingSprint
        lists={[{ id: lessonGame.lessonId, name: lessonGame.lessonName, items: lessonGame.vocabulary }]}
        initialListId={lessonGame.lessonId}
        initialDailyMode={lessonGame.dailyMode}
        fixedSource={{ kind: "lesson", courseSlug: lessonGame.courseSlug, lessonSlug: lessonGame.lessonSlug }}
        progressById={lessonGame.progressById}
        challengeDate={lessonGame.challengeDate}
        dailyCompletedToday={lessonGame.dailyCompletedToday}
        dailyBestAccuracy={lessonGame.dailyBestAccuracy}
        rankedMode={lessonGame.rankedGame === "typing_sprint"}
        rankedAttemptsRemaining={lessonGame.rankedAttemptsRemaining}
        backHref="/speed-test?game=typing"
        backLabel="Quay lại"
        onBackToArena={() => setActiveGame("arena")}
      />
    </ArenaGameShell>;
  }
  if (activeGame === "typing") {
    return <ReactionLessonPicker lessons={audioLessons} game="typing" dailyMode={typingDailyMode} onBack={() => setActiveGame("arena")} />;
  }
  if (activeGame === "audio" && audioGame) {
    return <ArenaGameShell activeGame={activeGame} setActiveGame={setActiveGame} hasAudioGame hasFlashGame={hasFlashGame} hasCardGame={hasCardGame}>{audioGame}</ArenaGameShell>;
  }
  if (activeGame === "audio" && lessonGame) {
    return <ArenaGameShell activeGame={activeGame} setActiveGame={setActiveGame} hasAudioGame hasFlashGame={hasFlashGame} hasCardGame={hasCardGame}>
      <AudioReaction
        vocabulary={lessonGame.vocabulary}
        lessonName={lessonGame.lessonName}
        lessonId={lessonGame.lessonId}
        courseSlug={lessonGame.courseSlug}
        lessonSlug={lessonGame.lessonSlug}
        progressById={lessonGame.progressById}
        backHref="/speed-test?game=audio"
        onBackToArena={() => setActiveGame("arena")}
        rankedMode={lessonGame.rankedGame === "audio_reaction"}
        rankedAttemptsRemaining={lessonGame.rankedAttemptsRemaining}
      />
    </ArenaGameShell>;
  }
  if (activeGame === "audio") {
    return <ReactionLessonPicker lessons={audioLessons} game="audio" onBack={() => setActiveGame("arena")} />;
  }
  if (activeGame === "flash" && flashGame) {
    return <ArenaGameShell activeGame={activeGame} setActiveGame={setActiveGame} hasAudioGame={hasAudioGame} hasFlashGame hasCardGame={hasCardGame}>{flashGame}</ArenaGameShell>;
  }
  if (activeGame === "flash" && lessonGame) {
    return <ArenaGameShell activeGame={activeGame} setActiveGame={setActiveGame} hasAudioGame={hasAudioGame} hasFlashGame hasCardGame={hasCardGame}>
      <FlashRecall
        vocabulary={lessonGame.vocabulary}
        lessonName={lessonGame.lessonName}
        lessonId={lessonGame.lessonId}
        courseSlug={lessonGame.courseSlug}
        lessonSlug={lessonGame.lessonSlug}
        progressById={lessonGame.progressById}
        backHref="/speed-test?game=flash"
        onBackToArena={() => setActiveGame("arena")}
        rankedMode={lessonGame.rankedGame === "flash_reaction"}
        rankedAttemptsRemaining={lessonGame.rankedAttemptsRemaining}
      />
    </ArenaGameShell>;
  }
  if (activeGame === "flash") {
    return <ReactionLessonPicker lessons={audioLessons} game="flash" onBack={() => setActiveGame("arena")} />;
  }
  if (activeGame === "card" && cardGame) {
    return <ArenaGameShell activeGame={activeGame} setActiveGame={setActiveGame} hasAudioGame={hasAudioGame} hasFlashGame={hasFlashGame} hasCardGame>{cardGame}</ArenaGameShell>;
  }
  if (activeGame === "card" && lessonGame) {
    return <ArenaGameShell activeGame={activeGame} setActiveGame={setActiveGame} hasAudioGame={hasAudioGame} hasFlashGame={hasFlashGame} hasCardGame>
      <CardReaction
        vocabulary={lessonGame.vocabulary}
        lessonName={lessonGame.lessonName}
        lessonId={lessonGame.lessonId}
        courseSlug={lessonGame.courseSlug}
        lessonSlug={lessonGame.lessonSlug}
        progressById={lessonGame.progressById}
        backHref="/speed-test?game=card"
        onBackToArena={() => setActiveGame("arena")}
        rankedMode={lessonGame.rankedGame === "card_reaction"}
        rankedAttemptsRemaining={lessonGame.rankedAttemptsRemaining}
      />
    </ArenaGameShell>;
  }
  if (activeGame === "card") return <ReactionLessonPicker lessons={audioLessons} game="card" onBack={() => setActiveGame("arena")} />;

  return (
    <main className="min-h-dvh bg-[radial-gradient(circle_at_top_left,#72dbfa_0%,transparent_32rem),linear-gradient(145deg,#0a84c1,#063b77)] px-4 py-6 text-white sm:px-6 sm:py-10">
      <section className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href={backHref} className="rounded-2xl bg-white/90 px-5 py-3 font-black text-[#10243e] shadow-lg">← Quay lại</Link>
          <div className="flex flex-wrap gap-2">
            <Link href="/bang-xep-hang?board=typing_sprint" className="rounded-2xl border border-amber-200 bg-amber-300 px-5 py-3 font-black text-amber-950 shadow-lg">♛ Bảng xếp hạng</Link>
            <Link href="/speed-test/lich-su" className="rounded-2xl border border-white/25 bg-white/10 px-5 py-3 font-black backdrop-blur">🏆 Thành tích</Link>
          </div>
        </div>
        <header className="mt-7 text-center">
          <p className="text-sm font-black uppercase tracking-[.28em] text-cyan-100">⚡ Speed Test Arena</p>
          <h1 className="mt-3 text-4xl font-black sm:text-6xl">Chọn thử thách phản xạ</h1>
          <p className="mx-auto mt-3 max-w-2xl font-semibold text-blue-100/80">Luyện tốc độ nhớ từ bằng bàn phím hoặc nghe audio của chính bài học.</p>
        </header>

        <div className="mt-9 grid gap-5 md:grid-cols-2">
          <ArenaGameCard
            onClick={() => setActiveGame("typing")}
            imageSrc="/speed-arena-typing-bg.png"
            className="border-white/25 text-white hover:shadow-[0_28px_60px_rgba(3,35,74,.4)]"
          >
            <p className="text-xs font-black uppercase tracking-[.2em] text-cyan-300">Chế độ trước đây</p>
            <h2 className="mt-2 text-3xl font-black">Typing Sprint</h2><p className="mt-3 max-w-md font-semibold leading-7 text-blue-100/75">Nhìn từ hoặc nghĩa rồi gõ đáp án. Có đồng hồ, combo, adaptive và Daily Speed Test như trước.</p>
            <span className="mt-6 inline-flex rounded-xl bg-white px-4 py-2.5 font-black text-[#087eba]">Chơi Typing Sprint →</span>
          </ArenaGameCard>
          <ArenaGameCard
            onClick={() => setActiveGame("audio")}
            imageSrc="/speed-arena-audio-bg.png"
            className="border-amber-200 text-amber-950 hover:shadow-[0_28px_60px_rgba(116,76,7,.32)]"
          >
            <p className="text-xs font-black uppercase tracking-[.2em] text-amber-700">Thử thách mới</p>
            <h2 className="mt-2 text-3xl font-black">Audio Reaction</h2><p className="mt-3 max-w-md font-semibold leading-7 text-amber-900/70">Nghe audio từ vựng trong từng bài học. Chọn hoặc gõ đáp án và bảo vệ năm mạng của bạn.</p>
            <span className="mt-6 inline-flex rounded-xl bg-amber-950 px-4 py-2.5 font-black text-amber-50">Chơi Audio Reaction →</span>
          </ArenaGameCard>
          <ArenaGameCard onClick={() => setActiveGame("flash")} imageSrc="/speed-arena-flash-bg.png" className="border-emerald-200 text-emerald-950 hover:shadow-[0_28px_60px_rgba(6,95,70,.28)]"><p className="text-xs font-black uppercase tracking-[.2em] text-emerald-700">Nhớ chủ động</p><h2 className="mt-2 text-3xl font-black">Flash Recall</h2><p className="mt-3 max-w-md font-semibold leading-7 text-emerald-900/70">Ghi nhớ từ trước khi nó biến mất, rồi chọn hoặc gõ đáp án trước khi hết giờ.</p><span className="mt-6 inline-flex rounded-xl bg-emerald-950 px-4 py-2.5 font-black text-emerald-50">Chơi Flash Recall →</span></ArenaGameCard>
          <ArenaGameCard onClick={() => setActiveGame("card")} imageSrc="/speed-arena-card-bg.png" className="border-fuchsia-200 text-fuchsia-950 hover:shadow-[0_28px_60px_rgba(112,26,117,.3)]"><p className="text-xs font-black uppercase tracking-[.2em] text-fuchsia-700">Dọn board nhanh nhất</p><h2 className="mt-2 text-3xl font-black">Card Reaction</h2><p className="mt-3 max-w-md font-semibold leading-7 text-fuchsia-950/70">Lật thẻ, trả lời đúng để giữ thẻ và clear toàn bộ board trước khi hết giờ hoặc hết mạng.</p><span className="mt-6 inline-flex rounded-xl bg-fuchsia-950 px-4 py-2.5 font-black text-fuchsia-50">Chơi Card Reaction →</span></ArenaGameCard>
        </div>
      </section>
    </main>
  );
}

function ArenaGameShell({
  activeGame,
  setActiveGame,
  hasAudioGame,
  hasFlashGame,
  hasCardGame,
  children,
}: {
  activeGame: ArenaGame;
  setActiveGame: (game: ArenaGame) => void;
  hasAudioGame: boolean;
  hasFlashGame: boolean;
  hasCardGame: boolean;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <FloatingLanguageKeyboard />
      <ArenaTabs
        activeGame={activeGame}
        setActiveGame={setActiveGame}
        hasAudioGame={hasAudioGame}
        hasFlashGame={hasFlashGame}
        hasCardGame={hasCardGame}
      />
      {children}
    </div>
  );
}

function ArenaGameCard({
  imageSrc,
  className,
  children,
  onClick,
}: {
  imageSrc: string;
  className: string;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative min-h-72 overflow-hidden rounded-[2rem] border p-7 text-left shadow-2xl transition hover:-translate-y-1 sm:p-9 ${className}`}
    >
      <Image
        src={imageSrc}
        alt=""
        aria-hidden="true"
        fill
        sizes="(max-width: 767px) 100vw, 50vw"
        className="object-cover"
      />
      <span aria-hidden="true" className="absolute inset-0 bg-white/15" />
      <span className="relative z-10 block">{children}</span>
    </button>
  );
}

function GameLoading() {
  return (
    <main className="grid min-h-dvh place-items-center bg-slate-950 p-6 text-white" aria-busy="true">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-pulse rounded-full bg-cyan-300" />
        <p className="mt-4 font-black">Đang chuẩn bị thử thách…</p>
      </div>
    </main>
  );
}

function ReactionLessonPicker({ lessons, game, dailyMode = false, onBack }: { lessons: AudioLesson[]; game: "typing" | "audio" | "flash" | "card"; dailyMode?: boolean; onBack: () => void }) {
  const typing = game === "typing";
  const audio = game === "audio";
  const card = game === "card";
  return <main className={`min-h-dvh px-4 py-6 sm:px-6 sm:py-10 ${typing ? "bg-[linear-gradient(145deg,#eaf7ff,#7dd3fc)] text-sky-950" : audio ? "bg-[linear-gradient(145deg,#fffdf4,#ffe88a)] text-amber-950" : card ? "bg-[linear-gradient(145deg,#faf5ff,#d8b4fe)] text-fuchsia-950" : "bg-[linear-gradient(145deg,#f0fdf4,#6ee7b7)] text-emerald-950"}`}><section className="mx-auto max-w-6xl"><button onClick={onBack} className="rounded-2xl border border-current/20 bg-white px-5 py-3 font-black shadow-md">← Quay lại Arena</button><header className="mx-auto mt-8 max-w-2xl text-center"><p className="text-sm font-black uppercase tracking-[.28em]">{typing ? "⌨️ Typing Sprint" : audio ? "🎧 Audio Reaction" : card ? "🃏 Card Reaction" : "⚡ Flash Reaction"}</p><h1 className="mt-3 text-4xl font-black sm:text-6xl">Chọn bài học</h1><p className="mt-3 font-semibold opacity-60">{audio ? "Bài test chỉ sử dụng audio từ vựng của bài học bạn chọn." : typing ? `Typing Sprint chỉ sử dụng từ vựng của bài học bạn chọn.${dailyMode ? " Đây là Daily Challenge hôm nay." : ""}` : "Bài test chỉ sử dụng từ vựng trong bài học bạn chọn."}</p></header>{lessons.length ? <div className="mt-9 grid gap-4 md:grid-cols-2">{lessons.map((lesson) => {
    const unlocked = lesson.speedTestUnlocked ?? true;
    const lessonHref = `/courses/${encodeURIComponent(lesson.courseSlug)}/lessons/${encodeURIComponent(lesson.lessonSlug)}`;
    const href = unlocked
      ? `${lessonHref}/speed-test?game=${game}${typing && dailyMode ? "&daily=1" : ""}`
      : `${lessonHref}?speedTest=locked`;
    return <Link key={lesson.id} href={href} className={`group rounded-[1.5rem] border p-6 shadow-lg transition hover:-translate-y-1 ${unlocked ? "border-current/15 bg-white/90" : "border-slate-300 bg-slate-100/90 text-slate-600"}`}><div className="flex items-start justify-between gap-3"><b className="text-xl">{lesson.name}</b><span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${unlocked ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>{unlocked ? "Đã mở" : `🔒 ${lesson.completionPercent ?? 0}%`}</span></div><span className="mt-2 block text-sm font-bold opacity-60">{unlocked ? typing ? "⌨️ Mở bài học để luyện gõ từ" : audio ? "🎧 Mở bài học để kiểm tra audio khả dụng" : card ? "🃏 Mở bài học để tạo board" : "⚡ Mở bài học để bắt đầu phản xạ" : "Học bài và đạt 75% tiến độ để mở thử thách."}</span><span className="mt-4 inline-flex font-black">{unlocked ? `Mở ${typing ? "Typing" : audio ? "Audio" : card ? "Card" : "Flash"} Test →` : "Tiếp tục học →"}</span></Link>;
  })}</div> : <p className="mt-9 rounded-3xl bg-white/80 p-8 text-center font-semibold">Chưa có bài học nào được phát hành.</p>}</section></main>;
}

function ArenaTabs({ activeGame, setActiveGame, hasAudioGame, hasFlashGame, hasCardGame }: { activeGame: ArenaGame; setActiveGame: (game: ArenaGame) => void; hasAudioGame: boolean; hasFlashGame: boolean; hasCardGame: boolean }) {
  return <nav aria-label="Chế độ Speed Test Arena" className="relative z-50 grid grid-cols-5 gap-1 border-b border-white/20 bg-[#071b32] p-2 text-center text-xs font-black text-white shadow-lg sm:gap-2 sm:px-6 sm:text-sm"><button onClick={() => setActiveGame("arena")} className="rounded-xl px-2 py-2.5 text-cyan-200 hover:bg-white/10">⚡ ARENA</button><button aria-current={activeGame === "typing" ? "page" : undefined} onClick={() => setActiveGame("typing")} className={`rounded-xl px-2 py-2.5 ${activeGame === "typing" ? "bg-cyan-400 text-[#071b32]" : "hover:bg-white/10"}`}>⌨️ TYPING</button><button disabled={!hasAudioGame} onClick={() => setActiveGame("audio")} className={`rounded-xl px-2 py-2.5 disabled:opacity-40 ${activeGame === "audio" ? "bg-amber-300 text-amber-950" : "hover:bg-white/10"}`}>🎧 AUDIO</button><button disabled={!hasFlashGame} onClick={() => setActiveGame("flash")} className={`rounded-xl px-2 py-2.5 disabled:opacity-40 ${activeGame === "flash" ? "bg-emerald-300 text-emerald-950" : "hover:bg-white/10"}`}>⚡ FLASH</button><button disabled={!hasCardGame} onClick={() => setActiveGame("card")} className={`rounded-xl px-2 py-2.5 disabled:opacity-40 ${activeGame === "card" ? "bg-fuchsia-300 text-fuchsia-950" : "hover:bg-white/10"}`}>🃏 CARD</button></nav>;
}
