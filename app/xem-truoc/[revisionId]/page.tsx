import Link from "next/link";
import { notFound } from "next/navigation";
import { LessonExperience } from "@/features/lesson/lesson-experience";
import { getCurrentActor } from "@/lib/auth/authorize";
import { getLessonRevision } from "@/lib/data/admin";

export const dynamic = "force-dynamic";

export default async function LessonPreviewPage({
  params,
}: {
  params: Promise<{ revisionId: string }>;
}) {
  const { revisionId } = await params;
  const [actor, revision] = await Promise.all([
    getCurrentActor(),
    getLessonRevision(revisionId),
  ]);
  if (!actor || !revision) notFound();
  const back = actor.roles.includes("admin")
    ? revision.status === "in_review"
      ? `/quan-tri/duyet/${revisionId}`
      : `/quan-tri/noi-dung/${revisionId}`
    : `/bien-tap/noi-dung/${revisionId}`;
  return (
    <>
      <div className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 bg-amber-400 px-5 py-3 text-[#10243e] shadow-lg">
        <p className="font-black">CHẾ ĐỘ XEM TRƯỚC — không lưu tiến độ học</p>
        <Link href={back} className="rounded-xl bg-[#10243e] px-4 py-2 font-black text-white">Thoát xem trước</Link>
      </div>
      <LessonExperience lesson={revision.lesson} previewMode />
    </>
  );
}
