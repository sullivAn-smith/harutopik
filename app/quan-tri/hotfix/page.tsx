import Link from "next/link";
import { getPublishedLessonsForHotfix } from "@/lib/data/admin";

export default async function AdminHotfixPage() {
  const lessons = await getPublishedLessonsForHotfix();
  return (
    <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <p className="text-sm font-black uppercase tracking-widest text-violet-600">
        Production hotfix
      </p>
      <h1 className="mt-2 text-4xl font-black">Bài đang phát hành</h1>
      <p className="mt-3 max-w-3xl leading-7 text-ink-600">
        Sửa nhanh lỗi nhỏ về chữ, ảnh hoặc audio mà không trả bài về biên tập.
        Nếu thay đổi cấu trúc lớn, hãy tạo phiên bản nội dung mới.
      </p>
      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        {lessons.map((lesson) => (
          <article key={lesson.contentId} className="surface-card bg-white p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-emerald-700">
                  Đang phát hành · v{lesson.version}
                </p>
                <h2 className="mt-2 text-2xl font-black">{lesson.title}</h2>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink-600">
                  {lesson.summary}
                </p>
              </div>
              <span className="rounded-full bg-violet-50 px-3 py-2 text-xs font-black text-violet-700">
                {lesson.dictationCount} câu nghe
              </span>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-5">
              <span className="text-sm font-bold text-ink-600">
                {lesson.vocabularyCount} từ vựng
              </span>
              <Link
                href={`/quan-tri/hotfix/${lesson.contentId}`}
                className="rounded-xl bg-violet-700 px-4 py-2.5 font-black text-white"
              >
                Mở chỉnh sửa nhanh →
              </Link>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
