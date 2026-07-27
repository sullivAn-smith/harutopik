"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

const levels = [1, 2, 3, 4, 5, 6];

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

function BookCover({ level }: { level: number }) {
  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl border-2 border-[#0b3658]/80 bg-gradient-to-br from-[#0b91c9] via-[#066d9f] to-[#064a75] shadow-[0_14px_28px_rgba(16,36,62,0.34)] ring-2 ring-white/35 transition duration-300 group-hover:-translate-y-2 group-hover:rotate-[-1deg] group-hover:shadow-[0_22px_38px_rgba(16,36,62,0.42)]">
      <div className="absolute inset-y-0 left-0 w-[8%] bg-gradient-to-r from-[#10243e]/25 to-transparent" />
      <div className="absolute -right-[25%] -top-[10%] aspect-square w-[85%] rounded-full bg-white/10 blur-sm" />
      <div className="absolute left-1/2 top-[13%] aspect-square w-[74%] -translate-x-1/2 rounded-full border border-white/70 bg-white/15 p-2 shadow-inner backdrop-blur-sm" />
      <div className="absolute left-1/2 top-[18%] flex aspect-square w-[64%] -translate-x-1/2 flex-col items-center justify-center rounded-full bg-white/95 px-1 text-center text-[#10243e] shadow-[0_8px_20px_rgba(16,36,62,0.16)]">
        <span className="max-w-full text-[clamp(.72rem,1.8vw,2rem)] font-black leading-none tracking-[-0.08em]">TOPIK</span>
        <span className="mt-2 text-[clamp(.42rem,.68vw,.72rem)] font-semibold leading-tight italic">Dành cho người</span>
        <span className="text-[clamp(.42rem,.68vw,.72rem)] font-semibold leading-tight italic">Việt</span>
      </div>
      <span className="absolute bottom-[6%] right-[10%] -rotate-6 text-[clamp(2rem,3.6vw,3.6rem)] font-black italic leading-none text-white drop-shadow-lg">
        {level}
      </span>
    </div>
  );
}

export default function Home() {
  const [showBooks, setShowBooks] = useState(false);
  const [comingSoon, setComingSoon] = useState(false);
  const [user, setUser] = useState<User | null | undefined>(undefined);

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
          <Link href="/nang-cap" className="rounded-xl bg-amber-300 px-3 py-2 text-amber-950">Pro</Link>
          <AccountLink user={user} compact />
        </nav>
      </header>
      <aside className="sidebar-shell fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-white/50 px-5 py-7 shadow-xl backdrop-blur lg:flex">
        <Link href="/" className="block border-b border-[#10243e]/10 pb-6">
          <Image src="/harutopik-logo-white.png" alt="Harutopik - Học tiếng Hàn" width={220} height={220} className="harutopik-logo logo-penguin-wave h-auto w-full" priority />
        </Link>
        <p className="mt-8 inline-flex w-fit items-center gap-2 rounded-full border border-white/70 bg-gradient-to-r from-[#10243e] to-[#245d93] px-4 py-2 text-sm font-black uppercase tracking-[0.14em] text-white shadow-[0_8px_18px_rgba(16,36,62,0.2)]"><span className="h-2 w-2 rounded-full bg-cyan-300" />Học tập</p>
        <nav className="mt-3 space-y-2">
          <Link href="/" className="flex items-center gap-3 rounded-2xl border border-white/80 bg-gradient-to-r from-[#168fd0] to-[#087eba] px-4 py-3.5 font-bold text-white shadow-[0_10px_22px_rgba(8,126,186,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_26px_rgba(8,126,186,0.3)]"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/18">⌂</span><span>Trang chủ</span></Link>
          <button onClick={() => setShowBooks((value) => !value)} aria-expanded={showBooks} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/80 bg-white/50 px-4 py-3.5 text-left font-bold text-[#10243e]/80 shadow-[0_8px_18px_rgba(16,36,62,0.09)] backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/75"><span className="flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-[#087eba]">▣</span><span>Tiếng Hàn TH</span></span><span className="text-sm text-[#087eba]">{showBooks ? "⌃" : "⌄"}</span></button>
          {showBooks && <div className="ml-4 space-y-1 border-l-2 border-[#087eba]/25 pl-3">{[1, 2, 3, 4, 5, 6].map((level) => <Link key={level} href={level === 1 ? "/courses/topik-1" : `/tieng-han-th/${level}`} onClick={(event) => { if (level > 1) { event.preventDefault(); setComingSoon(true); } }} className="block rounded-lg px-3 py-2 text-sm font-bold text-[#10243e]/70 transition hover:bg-[#e7f4ff] hover:text-[#087eba]">TOPIK {level}</Link>)}</div>}
          <Link href="/luyen-de" className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/50 px-4 py-3.5 font-bold text-[#10243e]/80 shadow-[0_8px_18px_rgba(16,36,62,0.09)] backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/75"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-[#087eba]">✎</span><span>Luyện đề</span></Link>
          <Link href="/tro-ly" className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/50 px-4 py-3.5 font-bold text-[#10243e]/80 shadow-[0_8px_18px_rgba(16,36,62,0.09)] backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/75"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-[#087eba]">✦</span><span>Trợ lý Haru AI</span></Link>
        </nav>
        <div className="mt-auto space-y-3">
          <Link href="/nang-cap" className="sidebar-upgrade flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-center font-black">♕ <span>Nâng cấp</span></Link>
          <AccountLink user={user} />
        </div>
      </aside>
      {comingSoon && <div className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-full border-2 border-orange-700 bg-yellow-300 px-6 py-3 text-lg font-black text-orange-950 shadow-[4px_4px_0_#10243e]">Sắp ra mắt</div>}
      <div className="home-grid-glow pointer-events-none absolute inset-0" />
      <div className="home-aurora home-aurora-one pointer-events-none absolute" />
      <div className="home-aurora home-aurora-two pointer-events-none absolute" />
      <div className="home-aurora home-aurora-three pointer-events-none absolute" />

      <section className="relative mx-auto max-w-[1500px] px-6 py-5 md:px-8 lg:ml-64">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="border-l-4 border-[#087eba] pl-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#087eba]">
              {user ? `Chào ${viewerName(user)}` : "Lộ trình học tiếng Hàn"}
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight md:text-4xl">
              Hôm nay bạn muốn học gì?
            </h1>
            <p className="mt-1 text-sm font-medium text-[#10243e]/65">
              Bắt đầu một bài ngắn, Haru sẽ lưu tiến độ cho bạn.
            </p>
          </div>
          {user && (
            <Link
              href="/tai-khoan"
              className="rounded-full border border-white/80 bg-white/65 px-4 py-2 text-sm font-black text-[#087eba] shadow-sm backdrop-blur transition hover:bg-white"
            >
              Xem tiến độ →
            </Link>
          )}
        </div>

        <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Link
            href="/courses/topik-1"
            className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#087eba] via-[#168fd0] to-[#20a9d8] p-6 text-white shadow-[0_18px_38px_rgba(8,126,186,0.28)] transition hover:-translate-y-1 hover:shadow-[0_24px_46px_rgba(8,126,186,0.36)] md:col-span-2"
          >
            <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/12" />
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100">
              Khóa học đang mở
            </p>
            <h2 className="mt-3 text-3xl font-black">Tiếp tục TOPIK 1</h2>
            <p className="mt-2 max-w-md font-semibold leading-7 text-white/80">
              Học từ vựng, ngữ pháp, nghe chép, ghép từ và kiểm tra ngay trong từng bài.
            </p>
            <span className="mt-6 inline-flex rounded-2xl bg-white px-5 py-3 font-black text-[#087eba] shadow-lg transition group-hover:translate-x-1">
              Bắt đầu học →
            </span>
          </Link>

          {[
            ["한", "Học bảng chữ cái", "Nắm chắc Hangul", "/hangul", "bg-violet-100 text-violet-700"],
            ["✎", "Luyện đề", "Ôn tập theo mục tiêu", "/luyen-de", "bg-amber-100 text-amber-700"],
          ].map(([icon, title, description, href, tone]) => (
            <Link
              key={href}
              href={href}
              className="rounded-3xl border border-white/80 bg-white/70 p-5 shadow-[0_12px_28px_rgba(16,36,62,0.1)] backdrop-blur transition hover:-translate-y-1 hover:bg-white hover:shadow-[0_18px_34px_rgba(16,36,62,0.16)]"
            >
              <span className={`flex h-11 w-11 items-center justify-center rounded-2xl text-xl font-black ${tone}`}>
                {icon}
              </span>
              <h2 className="mt-4 text-lg font-black">{title}</h2>
              <p className="mt-1 text-sm font-semibold text-[#10243e]/60">{description}</p>
              <span className="mt-4 inline-block text-sm font-black text-[#087eba]">Mở ngay →</span>
            </Link>
          ))}
        </div>

        <div className="mt-9 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#087eba]">Thư viện giáo trình</p>
            <h2 className="mt-1 text-2xl font-black">Tiếng Hàn TH</h2>
          </div>
          <p className="text-sm font-semibold text-[#10243e]/55">TH1 đang mở · TH2–TH6 đang biên soạn</p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 lg:gap-5">
          {levels.map((level) => (
            level === 1 ? (
              <Link key={level} href="/courses/topik-1" className="group relative" aria-label="Mở sách sơ cấp 1">
                <BookCover level={level} />
                <span className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-3 py-1.5 text-xs font-black text-[#087eba] shadow-lg">
                  HỌC NGAY
                </span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setComingSoon(true)}
                key={level}
                className="group relative cursor-not-allowed opacity-55 grayscale-[25%]"
                aria-label={`TOPIK ${level} sắp ra mắt`}
              >
                <BookCover level={level} />
                <span className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/80 bg-[#10243e]/85 px-3 py-1.5 text-xs font-black text-white shadow-md">
                  Sắp ra mắt
                </span>
              </button>
            )
          ))}
        </div>
      </section>
    </main>
  );
}
