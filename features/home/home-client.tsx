"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { CurriculumSeriesCover } from "@/features/library/curriculum-series-cover";
import { curriculumSeriesDefinitions } from "@/lib/catalog/curriculum-series";
import { createClient } from "@/lib/supabase/client";
import { StreakBanner } from "@/features/streak/streak-banner";
import type {
  LearnerStreak,
  LearnerStreakRules,
} from "@/lib/data/streaks";

type HomeStreakData = {
  streak: LearnerStreak | null;
  rules: LearnerStreakRules;
  period: "day" | "night";
};

const HOME_STREAK_CACHE_TTL_MS = 30_000;

function defaultHomeStreakData(): HomeStreakData {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(new Date()),
  );
  return {
    streak: null,
    rules: {
      shieldRewardInterval: 10,
      shieldRewardAmount: 1,
      maxShields: 10,
    },
    period: hour >= 5 && hour < 18 ? "day" : "night",
  };
}

function readCachedStreak(userId: string): HomeStreakData | null {
  try {
    const raw = window.sessionStorage.getItem(`harutopik:home-streak:${userId}`);
    if (!raw) return null;
    const cached = JSON.parse(raw) as { savedAt?: number; data?: HomeStreakData };
    if (!cached.savedAt || !cached.data || Date.now() - cached.savedAt > HOME_STREAK_CACHE_TTL_MS) {
      window.sessionStorage.removeItem(`harutopik:home-streak:${userId}`);
      return null;
    }
    return cached.data;
  } catch {
    return null;
  }
}

function writeCachedStreak(userId: string, data: HomeStreakData) {
  try {
    window.sessionStorage.setItem(
      `harutopik:home-streak:${userId}`,
      JSON.stringify({ savedAt: Date.now(), data }),
    );
  } catch {
    // Storage may be unavailable in strict privacy modes; the live request still works.
  }
}

function StreakLoadingCard() {
  return (
    <section
      aria-label="Đang tải chuỗi ngày học"
      aria-busy="true"
      className="relative min-h-[8.5rem] overflow-hidden rounded-3xl border border-white/30 bg-gradient-to-r from-[#0b6fa8] via-[#168fc7] to-[#54b7df] px-5 py-4 shadow-[0_16px_34px_rgba(14,46,101,.2)]"
    >
      <div className="absolute -right-14 -top-16 h-52 w-52 rounded-full bg-white/10" />
      <div className="relative flex h-full items-center gap-4">
        <div className="h-14 w-32 animate-pulse rounded-2xl bg-white/18" />
        <div className="h-16 min-w-0 flex-1 animate-pulse rounded-2xl bg-white/12" />
      </div>
    </section>
  );
}

export type CourseSummary = {
  id: string;
  slug: string;
  title: { ko: string; vi: string };
  summary: string;
  lessonCount: number;
  lessons: Array<{
    id: string;
    slug: string;
    order: number;
    title: { ko: string; vi: string };
  }>;
};

const fallbackCourses: CourseSummary[] = [{
  id: "course-topik-1",
  slug: "topik-1",
  title: { ko: "한국어 초급 1", vi: "Tiếng Hàn sơ cấp 1" },
  summary: "Lộ trình nền tảng dành cho người Việt bắt đầu học tiếng Hàn và chuẩn bị TOPIK I.",
  lessonCount: 15,
  lessons: [{
    id: "lesson-topik-1-01",
    slug: "bai-1",
    order: 1,
    title: { ko: "자기소개", vi: "Giới thiệu bản thân" },
  }],
}];

function viewerName(user: User) {
  const metadata = user.user_metadata;
  const name =
    metadata.display_name ?? metadata.full_name ?? metadata.name ?? user.email;
  return typeof name === "string" && name.trim() ? name.trim() : "Học viên";
}

function AccountLink({
  user,
  compact = false,
}: {
  user: User | null | undefined;
  compact?: boolean;
}) {
  if (user === undefined) {
    return (
      <span
        aria-label="Đang kiểm tra tài khoản"
        className={`${compact ? "h-9 w-24" : "h-12 w-full"} animate-pulse rounded-xl bg-white/45`}
      />
    );
  }

  if (!user) {
    return (
      <Link
        href="/dang-nhap"
        className={
          compact
            ? "rounded-xl bg-[#10243e] px-3 py-2 text-white"
            : "sidebar-login block w-full rounded-2xl px-4 py-3 text-center font-black text-white"
        }
      >
        Đăng nhập {!compact && <span className="ml-1">→</span>}
      </Link>
    );
  }

  const name = viewerName(user);
  return (
    <Link
      href="/tai-khoan"
      title={name}
      className={
        compact
          ? "flex max-w-40 items-center gap-2 rounded-xl bg-[#10243e] px-3 py-2 text-white"
          : "flex w-full items-center gap-3 rounded-2xl border border-white/80 bg-white/65 px-3 py-3 font-black text-[#10243e] shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
      }
    >
      <span
        aria-hidden="true"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-300 to-blue-500 text-xs font-black text-white"
      >
        {name.charAt(0).toLocaleUpperCase("vi")}
      </span>
      <span className="truncate">{compact ? "Tài khoản" : name}</span>
    </Link>
  );
}

export function HomeClient({
  initialCourses,
}: {
  initialCourses: CourseSummary[];
}) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [streakData, setStreakData] = useState<HomeStreakData | undefined>(undefined);
  const [showRoadmapNotice, setShowRoadmapNotice] = useState(false);
  const publishedCourses = initialCourses.length ? initialCourses : fallbackCourses;
  const primaryCourse = publishedCourses.find((course) => course.slug === "topik-1") ?? publishedCourses[0];
  const dailyLesson = primaryCourse.lessons[0];
  const dailySpeedTestHref = dailyLesson
    ? `/courses/${encodeURIComponent(primaryCourse.slug)}/lessons/${encodeURIComponent(dailyLesson.slug)}/speed-test?daily=1`
    : "/speed-test?daily=1";

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    let requestedUserId: string | null | undefined;

    async function loadForUser(nextUser: User | null) {
      const nextUserId = nextUser?.id ?? null;
      if (!active || requestedUserId === nextUserId) return;
      requestedUserId = nextUserId;
      setUser(nextUser);

      if (!nextUser) {
        setStreakData(defaultHomeStreakData());
        return;
      }

      const cached = readCachedStreak(nextUser.id);
      if (cached) setStreakData(cached);
      else setStreakData(undefined);

      const response = await fetch("/api/v1/home/streak", {
        credentials: "same-origin",
        headers: { accept: "application/json" },
      }).catch(() => null);
      if (!active) return;
      if (!response?.ok) {
        if (!cached) setStreakData(defaultHomeStreakData());
        return;
      }
      const payload = await response.json().catch(() => null) as {
        data?: HomeStreakData;
      } | null;
      if (!payload?.data) return;
      writeCachedStreak(nextUser.id, payload.data);
      setStreakData(payload.data);
    }

    void supabase.auth.getSession().then(({ data }) => {
      void loadForUser(data.session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void loadForUser(session?.user ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!showRoadmapNotice) return;
    const timeoutId = window.setTimeout(() => setShowRoadmapNotice(false), 2500);
    return () => window.clearTimeout(timeoutId);
  }, [showRoadmapNotice]);

  return (
    <main data-home-viewport="fixed-desktop" className="elegant-blue home-landing min-h-screen overflow-x-hidden text-[#101820] lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <header className="relative z-30 flex items-center justify-between border-b border-white/70 bg-white/70 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/" className="flex items-center gap-2 font-black">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/80 p-1 shadow-[0_8px_20px_rgba(16,36,62,0.14)] ring-1 ring-white">
            <Image src="/haru-mascot-clean.png" alt="" width={44} height={44} className="h-full w-full object-contain" priority />
          </span>
          Harutopik
        </Link>
        <nav aria-label="Điều hướng di động" className="flex items-center gap-2 text-sm font-bold">
          <AccountLink user={user} compact />
        </nav>
      </header>
      <aside className="sidebar-shell z-20 hidden h-dvh w-64 flex-col border-r border-white/50 px-5 py-7 backdrop-blur lg:sticky lg:top-0 lg:flex">
        <Link href="/" className="block border-b border-[#10243e]/10 pb-6">
          <Image src="/harutopik-logo-white.png" alt="Harutopik - Học tiếng Hàn" width={220} height={220} className="harutopik-logo logo-penguin-wave h-auto w-full" priority />
        </Link>
        <nav className="mt-6 min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-1 [scrollbar-color:rgba(8,126,186,0.45)_transparent] [scrollbar-width:thin]">
          <button type="button" onClick={() => setShowRoadmapNotice(true)} className="flex w-full items-center gap-3 rounded-2xl border border-white/80 bg-white/50 px-4 py-3.5 text-left text-[#10243e] shadow-[0_8px_18px_rgba(16,36,62,0.09)] backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/75"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-4.5 w-4.5 fill-none stroke-current" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19V8l5-4 4 3 7-4v12l-7 5-4-3-5 2Z" /><path d="M9 4v13M13 7v13" /></svg></span><span className="font-bold">Lộ trình</span>{showRoadmapNotice ? <span role="status" className="ml-auto shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-wide text-amber-700">Sắp ra mắt</span> : null}</button>
          <Link href="/tu-cua-toi" className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/50 px-4 py-3.5 font-bold text-[#10243e]/80 shadow-[0_8px_18px_rgba(16,36,62,0.09)] backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/75"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-cyan-100 text-[#087eba]"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-4.5 w-4.5 fill-none stroke-current" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M7 9h10M7 13h6" /><path d="M17.5 12.5v4M15.5 14.5h4" /></svg></span><span>Quản lý bộ từ</span></Link>
          <Link href="/ngu-phap-cua-toi" className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/50 px-4 py-3.5 font-bold text-[#10243e]/80 shadow-[0_8px_18px_rgba(16,36,62,0.09)] backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/75"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-4.5 w-4.5 fill-none stroke-current" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" /><path d="M7 8h10M7 12h7M7 16h4" /></svg></span><span>Quản lý bộ ngữ pháp</span></Link>
          <Link href="/luyen-de" className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/50 px-4 py-3.5 font-bold text-[#10243e]/80 shadow-[0_8px_18px_rgba(16,36,62,0.09)] backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/75"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-[#087eba]">✎</span><span>Luyện đề</span></Link>
          <Link href="/speed-test" className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/50 px-4 py-3.5 font-bold text-[#10243e]/80 shadow-[0_8px_18px_rgba(16,36,62,0.09)] backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/75"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700">⚡</span><span>Speed Test</span></Link>
          <Link href="/tro-ly" className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/50 px-4 py-3.5 font-bold text-[#10243e]/80 shadow-[0_8px_18px_rgba(16,36,62,0.09)] backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/75"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-[#087eba]">✦</span><span>Trợ lý Haru AI</span></Link>
        </nav>
        <div className="mt-auto space-y-3">
          <AccountLink user={user} />
        </div>
      </aside>
      <div className="home-grid-glow pointer-events-none absolute inset-0" />
      <div className="home-aurora home-aurora-one pointer-events-none absolute" />
      <div className="home-aurora home-aurora-two pointer-events-none absolute" />
      <div className="home-aurora home-aurora-three pointer-events-none absolute" />

      <section className="home-desktop-content relative w-full min-w-0 px-6 pb-32 pt-5 md:px-8 lg:pb-5">
        <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,.92fr)]">
          <div className="flex min-h-[8.5rem] min-w-0 flex-col justify-center rounded-3xl border border-white/60 bg-white/38 px-5 py-3.5 shadow-[0_12px_28px_rgba(16,36,62,.08)] backdrop-blur">
            <div className="border-l-4 border-[#087eba] pl-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#087eba]">
              {user ? `Chào ${viewerName(user)}` : "Lộ trình học tiếng Hàn"}
            </p>
            <h1 className="mt-0.5 text-2xl font-black tracking-tight md:text-3xl xl:whitespace-nowrap">
              Hôm nay bạn muốn học gì?
            </h1>
            <p className="mt-1 text-sm font-medium text-[#10243e]/65">
              Bắt đầu một bài ngắn, Haru sẽ lưu tiến độ cho bạn.
            </p>
            </div>
            {user && (
              <Link href="/tai-khoan" className="mt-2.5 w-fit rounded-full border border-white/80 bg-white/65 px-4 py-1.5 text-sm font-black text-[#087eba] shadow-sm transition hover:bg-white">
                Xem tiến độ →
              </Link>
            )}
          </div>
          {streakData ? <StreakBanner {...streakData} /> : <StreakLoadingCard />}
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div
            id="khoa-hoc-dang-mo"
            className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#087eba] via-[#168fd0] to-[#20a9d8] p-5 text-white shadow-[0_18px_38px_rgba(8,126,186,0.28)] transition hover:-translate-y-1 hover:shadow-[0_24px_46px_rgba(8,126,186,0.36)] md:col-span-2"
          >
            <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/12" />
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100">
              Khóa học đang mở
            </p>
            <h2 className="mt-2.5 text-2xl font-black md:text-[1.7rem]">{primaryCourse.title.vi}</h2>
            <p className="mt-2 max-w-md font-semibold leading-7 text-white/80">
              Học từ vựng, ngữ pháp, nghe chép, ghép từ và kiểm tra ngay trong từng bài.
            </p>
            <div className="relative mt-5 flex flex-wrap items-center gap-3">
              <Link href="/thu-vien/1" className="inline-flex rounded-2xl bg-white px-4 py-2.5 font-black text-[#087eba] shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl">
                Bắt đầu học →
              </Link>
              <Link href={dailySpeedTestHref} className="inline-flex items-center gap-2 rounded-2xl border border-amber-200/80 bg-amber-300 px-4 py-2.5 font-black text-amber-950 shadow-lg transition hover:-translate-y-0.5 hover:bg-amber-200 hover:shadow-xl">
                ⚡ Speed Test
              </Link>
            </div>
          </div>

          <Link href="/kien-thuc" className="group relative min-h-52 overflow-hidden rounded-[2rem] border border-violet-100 bg-gradient-to-br from-[#f0edff] via-[#f3f0ff] to-[#e7e4ff] p-5 shadow-[0_16px_34px_rgba(92,72,190,0.16)] transition hover:-translate-y-1 hover:shadow-[0_22px_42px_rgba(92,72,190,0.23)]">
            <span className="absolute right-7 top-7 rotate-6 text-4xl font-black text-violet-500/90">가</span>
            <span className="absolute right-20 top-16 h-3 w-3 rotate-45 rounded-sm bg-violet-400/70" />
            <h2 className="relative max-w-36 text-2xl font-black leading-tight text-[#10243e]">Kiến thức nền tảng</h2>
            <p className="relative mt-3 text-sm font-bold text-[#53627a]">Chữ cái và bảng số</p>
            <div className="absolute bottom-5 left-5 grid h-16 w-16 place-items-center rounded-[1.2rem] bg-gradient-to-br from-violet-300 to-violet-500 text-3xl font-black text-white shadow-[0_12px_24px_rgba(99,72,190,.3)] ring-4 ring-white/40 transition group-hover:-rotate-3 group-hover:scale-105">가</div>
            <span className="absolute bottom-7 right-6 text-sm font-black text-violet-700">Khám phá →</span>
          </Link>

          <Link href="/luyen-de" className="group relative min-h-52 overflow-hidden rounded-[2rem] border border-emerald-100 bg-gradient-to-br from-[#e8fbf5] via-[#e9faf7] to-[#d9f5ef] p-5 shadow-[0_16px_34px_rgba(31,150,132,0.15)] transition hover:-translate-y-1 hover:shadow-[0_22px_42px_rgba(31,150,132,0.22)]">
            <h2 className="relative text-2xl font-black text-[#10243e]">Luyện đề</h2>
            <p className="relative mt-3 text-sm font-bold text-[#53627a]">Ôn tập theo mục tiêu</p>
            <span className="relative mt-3 inline-block text-sm font-black text-emerald-700">Mở ngay →</span>
            <div className="absolute bottom-5 right-5 grid h-20 w-20 place-items-center rounded-full border-[8px] border-emerald-400/80 shadow-[0_12px_28px_rgba(31,150,132,.25)] transition group-hover:scale-105">
              <span className="h-12 w-12 rounded-full border-[9px] border-emerald-500/90"><span className="mx-auto mt-2 block h-3 w-3 rounded-full bg-emerald-700" /></span>
              <span className="absolute -right-2 -top-3 h-12 w-3 rotate-45 rounded-full bg-emerald-600" />
              <span className="absolute -right-1 -top-3 h-3 w-8 rotate-45 rounded-full bg-emerald-600" />
            </div>
            <span className="absolute bottom-8 left-7 rotate-[-18deg] text-3xl text-emerald-400/50">✦</span>
          </Link>
        </div>

        <div id="thu-vien" className="mt-5 flex flex-wrap items-center justify-between gap-4 scroll-mt-5 rounded-3xl border border-white/70 bg-white/65 px-5 py-3 shadow-[0_12px_28px_rgba(16,36,62,0.1)] backdrop-blur">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#087eba]">
              Kho học liệu
            </p>
            <h2 className="text-2xl font-black text-[#10243e]">
              Thư viện học
            </h2>
          </div>
        </div>

        <div data-home-series-grid="full-width" className="home-series-grid mt-4 grid w-full grid-cols-1 gap-4 sm:grid-cols-3 lg:gap-5">
          {curriculumSeriesDefinitions.map((series, index) => (
            <CurriculumSeriesCover
              key={series.id}
              series={series}
              priority={index === 0}
              compact
            />
          ))}
        </div>
      </section>
      <nav
        aria-label="Điều hướng chính trên điện thoại"
        className="fixed bottom-[max(.75rem,env(safe-area-inset-bottom))] left-3 right-3 z-40 grid grid-cols-4 gap-1 rounded-[1.6rem] border border-white/90 bg-white/88 p-1.5 shadow-[0_16px_44px_rgba(16,36,62,0.24)] backdrop-blur-2xl lg:hidden"
      >
        <Link href="/" aria-current="page" className="flex min-w-0 flex-col items-center gap-1 rounded-[1.15rem] bg-gradient-to-br from-[#087eba] to-[#19a7d5] px-1 py-2.5 text-[.68rem] font-black text-white shadow-[0_8px_20px_rgba(8,126,186,0.3)]">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9" /><path d="M9 20v-6h6v6" /></svg>
          <span>Trang chủ</span>
        </Link>
        <Link href="/thu-vien/1" className="flex min-w-0 flex-col items-center gap-1 rounded-[1.15rem] px-1 py-2.5 text-[.68rem] font-black text-[#52637a] transition active:scale-95 active:bg-sky-50 active:text-[#087eba]">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11a2 2 0 0 1 2 2v15a2 2 0 0 0-2-2H6.5A2.5 2.5 0 0 0 4 20.5z" /><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v17a2 2 0 0 1 2-2h2.5a2.5 2.5 0 0 1 2.5 2.5z" /></svg>
          <span>Học</span>
        </Link>
        <Link href="/tu-cua-toi" className="flex min-w-0 flex-col items-center gap-1 rounded-[1.15rem] px-1 py-2.5 text-[.68rem] font-black text-[#52637a] transition active:scale-95 active:bg-sky-50 active:text-[#087eba]">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M7 9h10M7 13h6" /><path d="M17.5 12.5v4M15.5 14.5h4" /></svg>
          <span>Bộ từ</span>
        </Link>
        <Link href="/luyen-de" className="flex min-w-0 flex-col items-center gap-1 rounded-[1.15rem] px-1 py-2.5 text-[.68rem] font-black text-[#52637a] transition active:scale-95 active:bg-sky-50 active:text-[#087eba]">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 4h6" /><path d="M9 2h6v4H9z" /><path d="M7 4H5a2 2 0 0 0-2 2v14h11" /><path d="m14 18 6-6 2 2-6 6-3 1z" /></svg>
          <span>Luyện đề</span>
        </Link>
      </nav>
    </main>
  );
}
