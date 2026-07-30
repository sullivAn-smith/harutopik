import type { Metadata } from "next";
import Link from "next/link";
import { PublishedContentManager } from "@/features/admin/published-content-manager";
import { getPublishedLessonsForHotfix } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Nội dung đang phát hành" };

export default async function AdminContentPage() {
  const lessons = await getPublishedLessonsForHotfix();

  return (
    <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="inline-flex rounded-full bg-violet-100 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-violet-700">
            Production content
          </span>
          <h1 className="mt-4 text-4xl font-black tracking-tight">
            Nội dung đang phát hành
          </h1>
          <p className="mt-3 max-w-3xl leading-7 text-ink-600">
            Theo dõi các bài người học đang nhìn thấy và xử lý nhanh lỗi nhỏ về
            chữ, ảnh hoặc audio ngay tại một nơi.
          </p>
        </div>
        <Link
          href="/quan-tri/phat-hanh"
          className="rounded-2xl bg-[#10243e] px-5 py-3 font-black text-white shadow-lg"
        >
          Quản lý phát hành →
        </Link>
      </div>

      <PublishedContentManager items={lessons} />
    </main>
  );
}
