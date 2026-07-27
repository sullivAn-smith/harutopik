import type { Metadata } from "next";
import Link from "next/link";
import { LessonDraftForm } from "@/features/admin/lesson-draft-form";
import { requirePermission } from "@/lib/auth/authorize";
import { getCatalogStructureOptions } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Tạo bài học" };

export default async function NewLessonPage() {
  await requirePermission("content:create");
  const catalogOptions = await getCatalogStructureOptions();

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <Link
        href="/quan-tri/noi-dung"
        className="text-sm font-black text-brand-700 hover:underline"
      >
        ← Quay lại nội dung
      </Link>
      <div className="mt-5">
        <p className="text-sm font-black uppercase tracking-widest text-brand-600">
          CMS Harutopik
        </p>
        <h1 className="mt-2 text-4xl font-black">Tạo bài học mới</h1>
        <p className="mt-3 text-ink-600">
          Nhập khung bài và từ vựng. Ngữ pháp, bài tập, audio TTS và workflow
          xuất bản sẽ được bổ sung trên cùng bản nháp ở các bước tiếp theo.
        </p>
      </div>
      <section className="surface-card mt-8 bg-white p-6 sm:p-8">
        <LessonDraftForm catalogOptions={catalogOptions} />
      </section>
    </main>
  );
}
