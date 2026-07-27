import Link from "next/link";
import { VocabularyLibrary } from "@/features/vocabulary-admin/vocabulary-library";
import { getVocabularyLibrary } from "@/lib/data/vocabulary-admin";

export default async function VocabularyLibraryPage() {
  const items = await getVocabularyLibrary();
  return (
    <main className="mx-auto max-w-7xl px-5 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-black uppercase tracking-widest text-brand-600">Nguồn dữ liệu dùng chung</p><h1 className="mt-2 text-4xl font-black">Thư viện từ vựng</h1><p className="mt-3 max-w-2xl text-ink-600">Tạo một lần, dùng lại trong nhiều bài học và mọi dạng luyện tập.</p></div>
        <div className="flex flex-wrap gap-3">
          <Link href="/bien-tap/nhap-tu-vung" className="rounded-2xl border-2 border-brand-200 bg-white px-5 py-3 font-black text-brand-700">Nhập Excel/CSV</Link>
          <Link href="/bien-tap/tu-vung/moi" className="rounded-2xl bg-brand-600 px-5 py-3 font-black text-white">+ Tạo từ mới</Link>
        </div>
      </div>
      <VocabularyLibrary items={items} />
    </main>
  );
}
