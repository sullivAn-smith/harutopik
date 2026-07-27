import Link from "next/link";
import { VocabularyForm } from "@/features/vocabulary-admin/vocabulary-form";

export default function NewVocabularyPage() {
  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <Link href="/bien-tap/tu-vung" className="text-sm font-black text-brand-700">← Thư viện từ vựng</Link>
      <div className="mt-5"><p className="text-sm font-black uppercase tracking-widest text-brand-600">Vocabulary CMS</p><h1 className="mt-2 text-4xl font-black">Tạo từ vựng mới</h1><p className="mt-3 text-ink-600">Điền nội dung một lần; hệ thống tự xác định các dạng luyện tập phù hợp.</p></div>
      <section className="surface-card mt-7 bg-white p-6 sm:p-8"><VocabularyForm /></section>
    </main>
  );
}
