"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  buildTopikShelf,
} from "@/lib/catalog/course-shelf";
import { createClient } from "@/lib/supabase/client";
import { StreakBanner } from "@/features/streak/streak-banner";
import type {
  LearnerStreak,
  LearnerStreakRules,
} from "@/lib/data/streaks";
import type { HomeNotificationSummary } from "@/lib/data/notifications";
import { LearnerStreakReminderPopup } from "@/features/notifications/learner-streak-reminder-popup";

const bookThemes = [
  "from-[#15a7d8] via-[#087eba] to-[#123f72]",
  "from-[#7c83f3] via-[#5964cf] to-[#303b91]",
  "from-[#42b9b0] via-[#168f9f] to-[#14576f]",
  "from-[#558bd8] via-[#3468b5] to-[#253f82]",
  "from-[#4ca8d8] via-[#287ba9] to-[#205377]",
  "from-[#7086b8] via-[#526b9d] to-[#34466f]",
];

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

function LockIcon() {
  return (
    <svg aria-label="Đang khóa" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function SidebarLibrary({
  topikShelf,
  onComingSoon,
}: {
  topikShelf: ReturnType<typeof buildTopikShelf<CourseSummary>>;
  onComingSoon: () => void;
}) {
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  const upcomingSeries = [
    { id: "vocabulary", title: "GIÁO TRÌNH TOPIK 2", total: 6 },
    { id: "grammar", title: "GIÁO TRÌNH TOPIK 3", total: 8 },
  ] as const;
  return (
    <div className="ml-3 border-l-2 border-[#087eba]/25 py-2 pl-3 pr-1">
      <section>
        <p className="px-2 pb-1 text-[.66rem] font-black uppercase tracking-[.15em] text-[#087eba]">GIÁO TRÌNH TOPIK 1</p>
        <div className="space-y-1">
          {topikShelf.map((item) => item.course ? (
            <div key={item.id} className="overflow-hidden rounded-xl bg-white/35">
              <button type="button" onClick={() => setExpandedCourseId((current) => current === item.course?.id ? null : item.course?.id ?? null)} className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-black text-[#10243e] transition hover:bg-white/70" aria-expanded={expandedCourseId === item.course.id}>
                <span>Quyển {item.level}</span>
                <span className="text-[#087eba]">{expandedCourseId === item.course.id ? "−" : "+"}</span>
              </button>
              {expandedCourseId === item.course.id && (
                <div className="border-t border-[#087eba]/10 bg-white/55 px-2 py-2">
                  <Link href={`/courses/${item.course.slug}`} className="mb-1 block rounded-lg bg-[#e7f4ff] px-2.5 py-2 text-xs font-black text-[#087eba]">Xem toàn bộ quyển →</Link>
                  <div className="space-y-1">
                    {item.course.lessons.map((lesson) => (
                      <Link key={lesson.id} href={`/courses/${item.course!.slug}/lessons/${lesson.slug}`} className="block rounded-lg px-2.5 py-2 text-xs font-bold text-[#344b67] transition hover:bg-white hover:text-[#087eba]">
                        <span className="font-black">Bài {lesson.order}</span>
                        <span className="ml-1 line-clamp-1">· {lesson.title.vi}</span>
                      </Link>
                    ))}
                    {item.course.lessons.length === 0 && <p className="px-2.5 py-2 text-xs font-bold text-slate-400">Chưa có bài phát hành</p>}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button type="button" key={item.id} onClick={onComingSoon} className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-bold text-[#10243e]/35 hover:bg-white/30">
              <span>Quyển {item.level}</span><LockIcon />
            </button>
          ))}
        </div>
      </section>
      {upcomingSeries.map((series) => (
        <section key={series.id} className="mt-4 border-t border-[#087eba]/15 pt-3">
          <p className="px-2 pb-1 text-[.66rem] font-black leading-4 text-[#087eba]">{series.title}</p>
          <div className="space-y-1">
            {Array.from({ length: series.total }, (_, index) => (
              <button type="button" key={`${series.id}-${index + 1}`} onClick={onComingSoon} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-bold text-[#10243e]/35 hover:bg-white/30">
                <span>Quyển {index + 1}</span><LockIcon />
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

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

function BookCover({ label, themeIndex }: { label: string; themeIndex: number }) {
  const theme = bookThemes[themeIndex % bookThemes.length] ?? bookThemes[0];
  return (
    <div className={`relative aspect-[3/4] w-full overflow-hidden rounded-2xl border-2 border-white/55 bg-gradient-to-br ${theme} shadow-[0_14px_28px_rgba(16,36,62,0.28)] ring-1 ring-[#10243e]/25 transition duration-300 group-hover:-translate-y-2 group-hover:rotate-[-1deg] group-hover:shadow-[0_22px_38px_rgba(16,36,62,0.38)]`}>
      <div className="absolute inset-y-0 left-0 w-[8%] bg-gradient-to-r from-[#10243e]/25 to-transparent" />
      <div className="absolute -right-[25%] -top-[10%] aspect-square w-[85%] rounded-full bg-white/10 blur-sm" />
      <div className="absolute left-1/2 top-[13%] aspect-square w-[74%] -translate-x-1/2 rounded-full border border-white/65 bg-white/15 p-2 shadow-inner backdrop-blur-sm" />
      <div className="absolute left-1/2 top-[18%] flex aspect-square w-[64%] -translate-x-1/2 flex-col items-center justify-center rounded-full bg-[#f7fbff]/95 px-2 text-center text-[#10243e] shadow-[0_8px_20px_rgba(16,36,62,0.16)]">
        <span className="max-w-full text-[clamp(.72rem,1.8vw,2rem)] font-black leading-none tracking-[-0.08em]">TOPIK</span>
        <span className="mt-2 text-[clamp(.4rem,.64vw,.68rem)] font-bold leading-tight text-[#245d93]">Nền tảng cho</span>
        <span className="text-[clamp(.4rem,.64vw,.68rem)] font-bold leading-tight text-[#245d93]">người Việt</span>
      </div>
      <span className="absolute bottom-[6%] right-[10%] -rotate-6 text-[clamp(2rem,3.6vw,3.6rem)] font-black italic leading-none text-white drop-shadow-lg">
        {label}
      </span>
    </div>
  );
}

const volumeBadgeThemes = [
  "bg-[#087eba]",
  "bg-[#5b5fc7]",
  "bg-[#de5b45]",
  "bg-[#118a74]",
  "bg-[#d18b18]",
  "bg-[#7a4fb2]",
];

function ShelfStatus({ count, total = 6 }: { count: number; total?: number }) {
  return (
    <div className="flex w-full items-center justify-end rounded-2xl border border-white/80 bg-white/75 px-5 py-2.5 shadow-[0_8px_20px_rgba(16,36,62,0.1)] backdrop-blur">
      <span className="rounded-full bg-[#e7f4ff] px-4 py-2 text-xs font-black tracking-wide text-[#245d93] sm:text-sm">
        {count}/{total} giáo trình TOPIK đang mở
      </span>
    </div>
  );
}

function UpcomingBookCover({
  index,
  series,
}: {
  index: number;
  series: "vocabulary" | "grammar";
}) {
  const coverSrc = series === "vocabulary"
    ? "/covers/harutopik-color-series-v2.png"
    : "/covers/harutopik-geometry-series.png";
  const badgeTheme = volumeBadgeThemes[index % volumeBadgeThemes.length] ?? volumeBadgeThemes[0];
  const coverTheme = bookThemes[index % bookThemes.length] ?? bookThemes[0];
  return (
    <div className={`relative aspect-[3/4] overflow-hidden rounded-2xl border-2 border-white/70 bg-gradient-to-br ${coverTheme} shadow-[0_14px_28px_rgba(16,36,62,0.2)] ring-1 ring-[#10243e]/20`}>
      <Image
        src={coverSrc}
        alt=""
        fill
        sizes="(min-width: 1024px) 14vw, (min-width: 640px) 30vw, 45vw"
        className="object-cover opacity-90 mix-blend-multiply"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-[#10243e]/16" />
      {series === "vocabulary" && (
        <>
          <span lang="ko" className="font-korean absolute left-[6%] top-[5%] text-[clamp(1rem,1.6vw,1.5rem)] font-black tracking-[-0.04em] text-[#95651f] [text-shadow:0_1px_0_#fff,0_0_8px_rgba(255,255,255,.82)]">
            한국어
          </span>
          <span className="absolute bottom-[20%] left-[6%] text-[clamp(.68rem,1vw,.9rem)] font-black text-[#10243e] [text-shadow:0_1px_0_#fff,0_0_7px_rgba(255,255,255,.86)]">
            Student&apos;s Book
          </span>
        </>
      )}
      {series === "grammar" && (
        <div className="absolute right-[7%] top-[8%] flex flex-col items-end leading-none drop-shadow-[0_2px_2px_rgba(255,255,255,.95)]">
          <span lang="ko" className="font-korean text-[clamp(1.2rem,2vw,1.85rem)] font-black tracking-[-0.05em] text-[#9a691f] [text-shadow:0_1px_0_#fff,0_0_8px_rgba(255,255,255,.72)]">
            한국어
          </span>
          <span className="mt-1 text-[clamp(.62rem,.9vw,.82rem)] font-black tracking-[0.08em] text-[#10243e] [text-shadow:0_1px_0_#fff,0_0_7px_rgba(255,255,255,.82)]">
            Korean
          </span>
        </div>
      )}
      <span className={`absolute bottom-[4%] right-[6%] grid h-10 w-10 place-items-center rounded-full border-2 border-white text-xl font-black text-white shadow-lg ${badgeTheme}`}>
        {index + 1}
      </span>
    </div>
  );
}

export function HomeClient({
  initialCourses,
  initialStreakData,
  initialNotificationSummary,
}: {
  initialCourses: CourseSummary[];
  initialStreakData: {
    streak: LearnerStreak | null;
    rules: LearnerStreakRules;
    period: "day" | "night";
  };
  initialNotificationSummary: HomeNotificationSummary;
}) {
  const [showBooks, setShowBooks] = useState(false);
  const [comingSoon, setComingSoon] = useState(false);
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const publishedCourses = initialCourses.length ? initialCourses : fallbackCourses;
  const topikShelf = buildTopikShelf(publishedCourses);
  const primaryCourse = publishedCourses.find((course) => course.slug === "topik-1") ?? publishedCourses[0];

  useEffect(() => {
    if (!comingSoon) return;
    const timer = window.setTimeout(() => setComingSoon(false), 2000);
    return () => window.clearTimeout(timer);
  }, [comingSoon]);

  useEffect(() => {
    const supabase = createClient();

    void supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <main className="elegant-blue home-landing min-h-screen overflow-hidden text-[#101820]">
      <header className="relative z-30 flex items-center justify-between border-b border-white/70 bg-white/70 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/" className="flex items-center gap-2 font-black">
          <Image src="/harutopik-logo-key.png" alt="" width={44} height={44} className="h-10 w-10 object-contain" />
          Harutopik
        </Link>
        <nav aria-label="Điều hướng di động" className="flex items-center gap-2 text-sm font-bold">
          <Link href="/thong-bao" aria-label={`Thông báo${initialNotificationSummary.unreadCount ? `, ${initialNotificationSummary.unreadCount} chưa đọc` : ""}`} className="relative grid h-10 w-10 place-items-center rounded-xl border border-white/80 bg-white/70 text-[#087eba] shadow-sm">
            <span aria-hidden="true">●</span>
            {initialNotificationSummary.unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-amber-300 px-1 text-[.62rem] font-black text-amber-950">
                {initialNotificationSummary.unreadCount > 9 ? "9+" : initialNotificationSummary.unreadCount}
              </span>
            )}
          </Link>
          <Link href="/nang-cap" className="rounded-xl bg-amber-300 px-3 py-2 text-amber-950">Pro</Link>
          <AccountLink user={user} compact />
        </nav>
      </header>
      <aside className="sidebar-shell fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-white/50 px-5 py-7 shadow-xl backdrop-blur lg:flex">
        <Link href="/" className="block border-b border-[#10243e]/10 pb-6">
          <Image src="/harutopik-logo-white.png" alt="Harutopik - Học tiếng Hàn" width={220} height={220} className="harutopik-logo logo-penguin-wave h-auto w-full" priority />
        </Link>
        <p className="mt-8 inline-flex w-fit items-center gap-2 rounded-full border border-white/70 bg-gradient-to-r from-[#10243e] to-[#245d93] px-4 py-2 text-sm font-black uppercase tracking-[0.14em] text-white shadow-[0_8px_18px_rgba(16,36,62,0.2)]"><span className="h-2 w-2 rounded-full bg-cyan-300" />Học tập</p>
        <nav className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-1 [scrollbar-color:rgba(8,126,186,0.45)_transparent] [scrollbar-width:thin]">
          <Link href="/" className="flex items-center gap-3 rounded-2xl border border-white/80 bg-gradient-to-r from-[#168fd0] to-[#087eba] px-4 py-3.5 font-bold text-white shadow-[0_10px_22px_rgba(8,126,186,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_26px_rgba(8,126,186,0.3)]"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/18">⌂</span><span>Trang chủ</span></Link>
          <button onClick={() => setShowBooks((value) => !value)} aria-expanded={showBooks} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/80 bg-white/50 px-4 py-3.5 text-left font-bold text-[#10243e]/80 shadow-[0_8px_18px_rgba(16,36,62,0.09)] backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/75"><span className="flex items-center gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-blue-100 text-[#087eba]"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-4.5 w-4.5 fill-none stroke-current" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11a2 2 0 0 1 2 2v15a2 2 0 0 0-2-2H6.5A2.5 2.5 0 0 0 4 20.5z" /><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v17a2 2 0 0 1 2-2h2.5a2.5 2.5 0 0 1 2.5 2.5z" /></svg></span><span>Thư viện học</span></span><span className="text-sm text-[#087eba]">{showBooks ? "⌃" : "⌄"}</span></button>
          {showBooks && <SidebarLibrary topikShelf={topikShelf} onComingSoon={() => setComingSoon(true)} />}
          <Link href="/tu-cua-toi" className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/50 px-4 py-3.5 font-bold text-[#10243e]/80 shadow-[0_8px_18px_rgba(16,36,62,0.09)] backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/75"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-cyan-100 text-[#087eba]"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-4.5 w-4.5 fill-none stroke-current" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M7 9h10M7 13h6" /><path d="M17.5 12.5v4M15.5 14.5h4" /></svg></span><span>Quản lý bộ từ</span></Link>
          <Link href="/luyen-de" className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/50 px-4 py-3.5 font-bold text-[#10243e]/80 shadow-[0_8px_18px_rgba(16,36,62,0.09)] backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/75"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-[#087eba]">✎</span><span>Luyện đề</span></Link>
          <Link href="/tro-ly" className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/50 px-4 py-3.5 font-bold text-[#10243e]/80 shadow-[0_8px_18px_rgba(16,36,62,0.09)] backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/75"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-[#087eba]">✦</span><span>Trợ lý Haru AI</span></Link>
          <Link href="/thong-bao" className="flex items-center justify-between gap-3 rounded-2xl border border-white/80 bg-white/50 px-4 py-3.5 font-bold text-[#10243e]/80 shadow-[0_8px_18px_rgba(16,36,62,0.09)] backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/75">
            <span className="flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700">●</span><span>Thông báo</span></span>
            {initialNotificationSummary.unreadCount > 0 && (
              <span className="grid min-h-6 min-w-6 place-items-center rounded-full bg-amber-300 px-1.5 text-xs font-black text-amber-950">
                {initialNotificationSummary.unreadCount > 99 ? "99+" : initialNotificationSummary.unreadCount}
              </span>
            )}
          </Link>
        </nav>
        <div className="mt-auto space-y-3">
          <Link href="/nang-cap" className="sidebar-upgrade flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-center font-black">♕ <span>Nâng cấp</span></Link>
          <AccountLink user={user} />
        </div>
      </aside>
      <LearnerStreakReminderPopup reminder={initialNotificationSummary.streakReminder} />
      {comingSoon && <div className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/80 bg-[#10243e] px-6 py-3 text-base font-black text-white shadow-[0_14px_30px_rgba(16,36,62,0.28)]">Khóa học chưa phát hành</div>}
      <div className="home-grid-glow pointer-events-none absolute inset-0" />
      <div className="home-aurora home-aurora-one pointer-events-none absolute" />
      <div className="home-aurora home-aurora-two pointer-events-none absolute" />
      <div className="home-aurora home-aurora-three pointer-events-none absolute" />

      <section className="relative mx-auto max-w-[1500px] px-6 py-5 md:px-8 lg:ml-64">
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
          <StreakBanner {...initialStreakData} />
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Link
            id="khoa-hoc-dang-mo"
            href={`/courses/${primaryCourse.slug}`}
            className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#087eba] via-[#168fd0] to-[#20a9d8] p-6 text-white shadow-[0_18px_38px_rgba(8,126,186,0.28)] transition hover:-translate-y-1 hover:shadow-[0_24px_46px_rgba(8,126,186,0.36)] md:col-span-2"
          >
            <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/12" />
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100">
              Khóa học đang mở
            </p>
            <h2 className="mt-3 text-3xl font-black">{primaryCourse.title.vi}</h2>
            <p className="mt-2 max-w-md font-semibold leading-7 text-white/80">
              Học từ vựng, ngữ pháp, nghe chép, ghép từ và kiểm tra ngay trong từng bài.
            </p>
            <span className="mt-6 inline-flex rounded-2xl bg-white px-5 py-3 font-black text-[#087eba] shadow-lg transition group-hover:translate-x-1">
              Bắt đầu học →
            </span>
          </Link>

          <Link href="/kien-thuc" className="group relative min-h-56 overflow-hidden rounded-[2rem] border border-violet-100 bg-gradient-to-br from-[#f0edff] via-[#f3f0ff] to-[#e7e4ff] p-6 shadow-[0_16px_34px_rgba(92,72,190,0.16)] transition hover:-translate-y-1 hover:shadow-[0_22px_42px_rgba(92,72,190,0.23)]">
            <span className="absolute right-7 top-7 rotate-6 text-4xl font-black text-violet-500/90">가</span>
            <span className="absolute right-20 top-16 h-3 w-3 rotate-45 rounded-sm bg-violet-400/70" />
            <h2 className="relative max-w-36 text-2xl font-black leading-tight text-[#10243e]">Kiến thức nền tảng</h2>
            <p className="relative mt-3 text-sm font-bold text-[#53627a]">Chữ cái và bảng số</p>
            <div className="absolute bottom-5 left-6 grid h-20 w-20 place-items-center rounded-[1.4rem] bg-gradient-to-br from-violet-300 to-violet-500 text-4xl font-black text-white shadow-[0_12px_24px_rgba(99,72,190,.3)] ring-4 ring-white/40 transition group-hover:-rotate-3 group-hover:scale-105">가</div>
            <span className="absolute bottom-7 right-6 text-sm font-black text-violet-700">Khám phá →</span>
          </Link>

          <Link href="/luyen-de" className="group relative min-h-56 overflow-hidden rounded-[2rem] border border-emerald-100 bg-gradient-to-br from-[#e8fbf5] via-[#e9faf7] to-[#d9f5ef] p-6 shadow-[0_16px_34px_rgba(31,150,132,0.15)] transition hover:-translate-y-1 hover:shadow-[0_22px_42px_rgba(31,150,132,0.22)]">
            <h2 className="relative text-2xl font-black text-[#10243e]">Luyện đề</h2>
            <p className="relative mt-3 text-sm font-bold text-[#53627a]">Ôn tập theo mục tiêu</p>
            <span className="relative mt-3 inline-block text-sm font-black text-emerald-700">Mở ngay →</span>
            <div className="absolute bottom-5 right-6 grid h-24 w-24 place-items-center rounded-full border-[10px] border-emerald-400/80 shadow-[0_12px_28px_rgba(31,150,132,.25)] transition group-hover:scale-105">
              <span className="h-12 w-12 rounded-full border-[9px] border-emerald-500/90"><span className="mx-auto mt-2 block h-3 w-3 rounded-full bg-emerald-700" /></span>
              <span className="absolute -right-2 -top-3 h-12 w-3 rotate-45 rounded-full bg-emerald-600" />
              <span className="absolute -right-1 -top-3 h-3 w-8 rotate-45 rounded-full bg-emerald-600" />
            </div>
            <span className="absolute bottom-8 left-7 rotate-[-18deg] text-3xl text-emerald-400/50">✦</span>
          </Link>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/70 bg-white/65 px-5 py-3 shadow-[0_12px_28px_rgba(16,36,62,0.1)] backdrop-blur">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#087eba]">
              Kho học liệu
            </p>
            <h2 className="text-2xl font-black text-[#10243e]">
              Thư viện học
            </h2>
          </div>
          <p className="rounded-full bg-[#e7f4ff] px-4 py-2 text-sm font-bold text-[#245d93]">
            {topikShelf.filter((item) => item.course).length}/6 giáo trình TOPIK đang mở
          </p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 lg:gap-5">
          {topikShelf.map((item, index) => (
            item.course ? (
              <Link key={item.id} href={`/courses/${item.course.slug}`} className="group relative" aria-label={`Mở ${item.course.title.vi}`}>
                <BookCover label={String(item.level)} themeIndex={index} />
                <span className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-3 py-1.5 text-xs font-black text-[#087eba] shadow-lg">
                  HỌC NGAY
                </span>
              </Link>
            ) : (
              <button type="button" onClick={() => setComingSoon(true)} key={item.id} className="relative opacity-45 grayscale-[45%]" aria-label={`${item.label} chưa phát hành`}>
                <BookCover label={String(item.level)} themeIndex={index} />
                <span className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/80 bg-[#10243e]/85 px-3 py-1.5 text-xs font-black text-white shadow-md">Sắp ra mắt</span>
              </button>
            )
          ))}
        </div>

        {(["vocabulary", "grammar"] as const).map((series) => (
          <section key={series} className="mt-9" aria-label={series === "vocabulary" ? "Bộ giáo trình từ vựng sắp ra mắt" : "Bộ giáo trình ngữ pháp sắp ra mắt"}>
            <ShelfStatus count={0} total={series === "grammar" ? 8 : 6} />
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 lg:gap-5">
              {Array.from({ length: series === "grammar" ? 8 : 6 }, (_, index) => (
                <button
                  type="button"
                  key={`${series}-${index + 1}`}
                  onClick={() => setComingSoon(true)}
                  className="group relative opacity-70 grayscale-[8%] transition hover:opacity-80"
                  aria-label={`${series === "vocabulary" ? "Giáo trình từ vựng" : "Giáo trình ngữ pháp"} quyển ${index + 1} chưa phát hành`}
                >
                  <UpcomingBookCover index={index} series={series} />
                  <span className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/80 bg-[#10243e]/88 px-3 py-1.5 text-xs font-black text-white shadow-md">Sắp ra mắt</span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </section>
    </main>
  );
}
