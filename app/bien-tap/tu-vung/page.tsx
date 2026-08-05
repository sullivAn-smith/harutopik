import Link from "next/link";
import { VocabularyLibrary } from "@/features/vocabulary-admin/vocabulary-library";
import { getVocabularyLibrary } from "@/lib/data/vocabulary-admin";

export default async function VocabularyLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{
    delete?: string;
    count?: string;
    errorMessage?: string;
  }>;
}) {
  const items = await getVocabularyLibrary();
  const notice = await searchParams;
  return (
    <main className="mx-auto max-w-7xl px-5 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-black uppercase tracking-widest text-brand-600">Nguồn dữ liệu dùng chung</p><h1 className="mt-2 text-4xl font-black">Thư viện từ vựng</h1><p className="mt-3 max-w-2xl text-ink-600">Tạo một lần, dùng lại trong nhiều bài học và mọi dạng luyện tập.</p></div>
        <div className="flex flex-wrap gap-3">
          <Link href="/bien-tap/nhap-tu-vung" className="rounded-2xl border-2 border-brand-200 bg-white px-5 py-3 font-black text-brand-700">Nhập Excel/CSV</Link>
          <Link href="/bien-tap/tu-vung/moi" className="rounded-2xl bg-brand-600 px-5 py-3 font-black text-white">+ Tạo từ mới</Link>
        </div>
      </div>
      {notice.delete === "done" && (
        <p role="status" className="mt-6 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-800">
          Đã xóa {notice.count ? `${notice.count} từ vựng` : "từ vựng"} bản nháp khỏi thư viện.
        </p>
      )}
      {notice.delete === "error" && (
        <p role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 font-bold text-red-800">
          {notice.errorMessage || "Chưa thể xóa các từ đã chọn. Hãy thử lại."}
        </p>
      )}
      <VocabularyLibrary items={items} />
    </main>
  );
}
