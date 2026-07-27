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
      <Link href="/" className="mx-auto flex w-fit items-center gap-3">
        <Image
          src="/harutopik-logo-key.png"
          alt=""
          width={54}
          height={54}
          className="h-12 w-12 object-contain"
        />
        <span className="text-xl font-black text-ink-900">Harutopik</span>
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
