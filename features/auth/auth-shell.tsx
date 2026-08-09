import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_15%_10%,#dff4ff_0,transparent_35rem),linear-gradient(145deg,#f7fbff,#edf8fc)] px-5 py-8">
      <Link href="/" className="group mx-auto flex w-fit items-center gap-3 rounded-2xl px-3 py-2 transition hover:bg-white/70">
        <span className="grid h-14 w-14 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-50 to-emerald-100 ring-1 ring-cyan-100 shadow-sm transition group-hover:-rotate-3 group-hover:scale-105">
          <Image
            src="/haru-mascot-clean.png"
            alt="Chim cánh cụt Haru"
            width={56}
            height={56}
            className="h-[52px] w-[52px] object-contain"
            priority
          />
        </span>
        <span className="text-2xl font-black tracking-tight text-[#10243e]">Harutopik</span>
      </Link>

      <section className="surface-card mx-auto mt-7 w-full max-w-md bg-white/90 p-6 sm:p-9">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-brand-600">
          {eyebrow}
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-ink-900">
          {title}
        </h1>
        <p className="mt-3 leading-7 text-ink-600">{description}</p>
        {children}
      </section>
    </main>
  );
}
