"use client";

import Link from "next/link";
import { useState } from "react";

type PublishedLessonItem = {
  contentId: string;
  version: number;
  title: string;
  summary: string;
  vocabularyCount: number;
  dictationCount: number;
  publishedAt: string;
};

export function PublishedContentManager({
  items,
}: {
  items: PublishedLessonItem[];
}) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase("vi-VN");
  const filteredItems = items.filter((item) =>
    `${item.title} ${item.contentId}`
      .toLocaleLowerCase("vi-VN")
      .includes(normalizedQuery),
  );

  return (
    <>
      <label className="mt-7 block">
        <span className="sr-only">Tìm bài đang phát hành</span>
        <div className="flex items-center gap-3 rounded-2xl border-2 border-slate-200 bg-white px-5 shadow-sm transition focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-100">
          <span aria-hidden="true" className="text-xl text-violet-600">
            ⌕
          </span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm theo tên bài hoặc ID nội dung…"
            className="min-h-14 w-full bg-transparent font-semibold outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-ink-600 hover:bg-slate-200"
            >
              Xóa tìm kiếm
            </button>
          )}
        </div>
      </label>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm font-bold text-ink-600">
        <p>{filteredItems.length} bài đang phát hành</p>
        <p>Mới cập nhật gần nhất ở trên</p>
      </div>

      {filteredItems.length === 0 ? (
        <section className="surface-card mt-5 bg-white p-10 text-center">
          <p className="text-xl font-black">
            {query
              ? "Không tìm thấy bài phù hợp"
              : "Chưa có bài học đang phát hành"}
          </p>
          <p className="mt-2 text-ink-600">
            {query
              ? "Hãy thử tìm bằng tên bài hoặc ID khác."
              : "Bài được phát hành sẽ xuất hiện tại đây để admin quản lý và hotfix."}
          </p>
        </section>
      ) : (
        <section className="surface-card mt-5 overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-left">
              <thead className="bg-slate-50 text-sm text-ink-600">
                <tr>
                  <th className="px-6 py-4">Bài học</th>
                  <th className="px-5 py-4">Phiên bản</th>
                  <th className="px-5 py-4">Học liệu</th>
                  <th className="px-5 py-4">Phát hành</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr
                    key={item.contentId}
                    className="border-t border-slate-100 transition hover:bg-violet-50/30"
                  >
                    <td className="px-6 py-5">
                      <p className="text-base font-black text-ink-900">
                        {item.title}
                      </p>
                      <p className="mt-1 font-mono text-xs font-bold text-brand-700">
                        {item.contentId}
                      </p>
                      <p className="mt-2 line-clamp-1 max-w-lg text-sm text-ink-500">
                        {item.summary}
                      </p>
                    </td>
                    <td className="px-5 py-5">
                      <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">
                        v{item.version}
                      </span>
                    </td>
                    <td className="px-5 py-5 text-sm font-bold text-ink-600">
                      <p>{item.vocabularyCount} từ</p>
                      <p className="mt-1">{item.dictationCount} câu nghe</p>
                    </td>
                    <td className="px-5 py-5 text-sm font-bold text-ink-600">
                      {new Intl.DateTimeFormat("vi-VN").format(
                        new Date(item.publishedAt),
                      )}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <Link
                        href={`/quan-tri/hotfix/${item.contentId}`}
                        className="inline-flex min-h-11 items-center rounded-xl bg-gradient-to-r from-violet-700 to-blue-600 px-4 py-2.5 font-black text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
                      >
                        Hotfix →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
