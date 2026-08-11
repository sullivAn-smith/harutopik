"use client";

import Link from "next/link";
import { useState } from "react";

import type { CurriculumSeriesDefinition } from "@/lib/catalog/curriculum-series";

export type CurriculumLesson = {
  id: string;
  slug: string;
  order: number;
  title: string;
};

export type CurriculumBook = {
  number: number;
  status: "published" | "locked";
  courseSlug: string | null;
  lessons: CurriculumLesson[];
};

const themeStyles = {
  blue: {
    row: "from-white/95 via-[#f4fbff] to-[#dcefff] border-white/80",
    badge: "from-[#168fd0] to-[#075b9a]",
    accent: "text-[#087eba] bg-sky-50",
    glow: "bg-sky-300/35",
  },
  cyan: {
    row: "from-[#e2fbfd] via-white to-[#cff7f5] border-cyan-200",
    badge: "from-[#22c5d5] to-[#087f99]",
    accent: "text-[#087f99] bg-cyan-50",
    glow: "bg-cyan-300/35",
  },
  green: {
    row: "from-[#e9fbef] via-white to-[#d8f6e3] border-emerald-200",
    badge: "from-[#45c681] to-[#14724e]",
    accent: "text-[#14724e] bg-emerald-50",
    glow: "bg-emerald-300/35",
  },
} satisfies Record<CurriculumSeriesDefinition["theme"], {
  row: string;
  badge: string;
  accent: string;
  glow: string;
}>;

export function CurriculumSeriesLibrary({
  series,
  books,
  signedIn = true,
}: {
  series: CurriculumSeriesDefinition;
  books: CurriculumBook[];
  signedIn?: boolean;
}) {
  const [expandedBookNumber, setExpandedBookNumber] = useState<number | null>(null);
  const theme = themeStyles[series.theme];

  return (
    <div className="space-y-4">
      {books.map((book) => {
        const locked = book.status === "locked";
        const expanded = !locked && expandedBookNumber === book.number;

        return (
          <article
            key={book.number}
            data-book-card
            data-book-state={locked ? "locked" : "published"}
            className={`relative overflow-hidden rounded-[1.65rem] border bg-gradient-to-r shadow-[0_14px_34px_rgba(16,36,62,0.11)] transition duration-300 ${theme.row} ${expanded ? "ring-2 ring-white/80 shadow-[0_22px_48px_rgba(16,36,62,.18)]" : ""}`}
          >
            <span aria-hidden="true" className={`pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full blur-2xl ${theme.glow}`} />
            <button
              type="button"
              aria-label={`Quyển ${book.number}`}
              aria-expanded={expanded}
              aria-disabled={locked}
              onClick={() => {
                if (locked) return;
                setExpandedBookNumber((current) => current === book.number ? null : book.number);
              }}
              className={`relative flex w-full items-center gap-4 px-4 py-3.5 text-left transition focus-visible:outline-4 focus-visible:outline-offset-[-4px] focus-visible:outline-[#087eba] md:gap-5 md:px-6 ${locked ? "cursor-not-allowed" : "hover:bg-white/55"}`}
            >
              <span data-book-cover className={`relative grid h-[5.8rem] w-[4.4rem] shrink-0 overflow-hidden rounded-[1rem] border border-white/70 bg-gradient-to-br p-2 text-white shadow-[0_12px_24px_rgba(16,36,62,.22)] ${theme.badge} ${locked ? "grayscale-[.25] opacity-55" : ""}`}>
                <span aria-hidden="true" className="absolute inset-y-0 left-0 w-2 bg-[#10243e]/16" />
                <span aria-hidden="true" className="absolute -right-5 -top-6 h-16 w-16 rounded-full bg-white/18" />
                <span className="relative self-end justify-self-end text-3xl font-black italic leading-none">
                  {book.number}
                </span>
              </span>
              <span className={`min-w-0 flex-1 ${locked ? "opacity-55" : ""}`}>
                <span className="mb-1 block text-[.68rem] font-black uppercase tracking-[.16em] text-[#087eba]">
                  {locked ? "Đang biên soạn" : "Giáo trình đang mở"}
                </span>
                <strong className="block text-xl font-black text-[#10243e] md:text-[1.65rem]">
                  Quyển {book.number}
                </strong>
                <span className="mt-1 block text-sm font-bold text-[#52637a]">
                  {locked ? "Nội dung đang được biên soạn" : `${book.lessons.length} bài đã phát hành`}
                </span>
              </span>
              {locked ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/55 px-3 py-2 text-xs font-black text-[#52637a] shadow-sm">
                  <span aria-hidden="true">🔒</span>
                  <span>Sắp ra mắt</span>
                </span>
              ) : (
                <span className={`inline-flex shrink-0 items-center gap-2 rounded-full border border-white/90 px-3 py-2 text-xs font-black shadow-sm transition md:px-4 md:text-sm ${theme.accent}`}>
                  <span>Xem bài học</span>
                  <span className={`text-lg leading-none transition ${expanded ? "rotate-45" : ""}`} aria-hidden="true">+</span>
                </span>
              )}
            </button>

            {expanded && (
              <div className="border-t border-[#10243e]/8 bg-white/72 px-4 py-4 backdrop-blur md:px-6">
                {book.lessons.length > 0 && book.courseSlug ? (
                  <div className="space-y-2">
                    {book.lessons.map((lesson) => {
                      const lessonHref = `/courses/${book.courseSlug}/lessons/${lesson.slug}`;
                      return (
                        <Link
                          key={lesson.id}
                          href={signedIn ? lessonHref : `/dang-nhap?next=${encodeURIComponent(lessonHref)}`}
                          className="flex items-center gap-4 rounded-2xl border border-white bg-white/80 px-4 py-3 font-bold text-[#344b67] shadow-sm transition hover:-translate-y-0.5 hover:text-[#087eba] hover:shadow-md"
                        >
                          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-black ${theme.accent}`}>
                            {lesson.order}
                          </span>
                          <span className="min-w-0 flex-1">
                            <strong className="font-black">Bài {lesson.order}</strong>
                            <span className="ml-2">· {lesson.title}</span>
                          </span>
                          <span aria-hidden="true">→</span>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <p className="rounded-2xl bg-white/80 px-4 py-4 text-center font-bold text-[#52637a]">
                    Chưa có bài phát hành
                  </p>
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
