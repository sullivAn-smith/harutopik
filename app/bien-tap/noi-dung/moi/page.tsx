import Link from "next/link";
import { LessonDraftForm } from "@/features/admin/lesson-draft-form";
import { requirePermission } from "@/lib/auth/authorize";
import { getCatalogStructureOptions } from "@/lib/data/admin";

export default async function NewEditorLessonPage() {
  await requirePermission("content:create");
  const catalogOptions = await getCatalogStructureOptions();
  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <Link href="/bien-tap/noi-dung" className="text-sm font-black text-brand-700">← Bài học của tôi</Link>
      <div className="mt-5 rounded-3xl bg-gradient-to-r from-[#10243e] to-[#087eba] p-7 text-white">
        <p className="text-sm font-black uppercase tracking-widest text-cyan-200">Bài học mới</p>
        <h1 className="mt-2 text-4xl font-black">Bắt đầu từ nội dung cốt lõi</h1>
        <p className="mt-3 max-w-2xl leading-7 text-blue-100">Điền thông tin theo từng nhóm. Bạn có thể lưu bản nháp và quay lại hoàn thiện trước khi gửi duyệt.</p>
      </div>
      <section className="surface-card mt-7 bg-white p-6 sm:p-8">
        <LessonDraftForm returnTo="/bien-tap/noi-dung" catalogOptions={catalogOptions} />
      </section>
    </main>
  );
}
