import Link from "next/link";
import { notFound } from "next/navigation";
import { PublishedLessonHotfixForm } from "@/features/admin/published-lesson-hotfix-form";
import { getPublishedLessonForHotfix } from "@/lib/data/admin";

export default async function AdminLessonHotfixPage({
  params,
  searchParams,
}: {
  params: Promise<{ contentId: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { contentId } = await params;
  const [published, notice] = await Promise.all([
    getPublishedLessonForHotfix(contentId),
    searchParams,
  ]);
  if (!published) notFound();
  return (
    <main className="mx-auto max-w-5xl px-5 py-10 lg:px-8">
      <Link href="/quan-tri/noi-dung" className="font-black text-violet-700">
        ← Nội dung đang phát hành
      </Link>
      <div className="mt-5 rounded-3xl bg-[linear-gradient(120deg,#10243e,#49338b)] p-7 text-white">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-200">
          Hotfix production · phiên bản {published.version}
        </p>
        <h1 className="mt-3 text-4xl font-black">{published.lesson.title.vi}</h1>
        <p className="mt-3 max-w-3xl text-slate-200">
          Bài hiện vẫn phục vụ người học. Các thay đổi bên dưới chỉ có hiệu lực
          sau khi bạn xác nhận áp dụng hotfix.
        </p>
      </div>
      {notice.saved === "1" && (
        <p role="status" className="mt-6 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-800">
          Hotfix đã được áp dụng cho người học.
        </p>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={`/courses/topik-1/lessons/${published.lesson.slug}`}
          className="rounded-xl border-2 border-violet-200 bg-white px-4 py-2 font-black text-violet-800"
        >
          ▶ Xem như người học
        </Link>
        <Link
          href="/quan-tri/phat-hanh"
          className="rounded-xl border-2 border-rose-200 bg-rose-50 px-4 py-2 font-black text-rose-800"
        >
          Tạm gỡ bài
        </Link>
      </div>
      <section className="mt-7">
        <PublishedLessonHotfixForm lesson={published.lesson} />
      </section>
    </main>
  );
}
