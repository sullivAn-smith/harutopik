import Link from "next/link";
import { VocabularyImportUploadForm } from "@/features/vocabulary-import/upload-form";

export default function VocabularyImportPage() {
  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <Link href="/bien-tap/tu-vung" className="text-sm font-black text-brand-700">
        ← Thư viện từ vựng
      </Link>
      <div className="mt-5 grid gap-7 lg:grid-cols-[1.1fr_.9fr]">
        <section className="surface-card bg-white p-7 sm:p-9">
          <p className="text-sm font-black uppercase tracking-widest text-brand-600">
            Nhập hàng loạt
          </p>
          <h1 className="mt-2 text-4xl font-black">Nhập từ bằng Excel/CSV</h1>
          <p className="mt-3 leading-7 text-ink-600">
            Hệ thống chỉ tạo bản nháp sau khi bạn xem trước và xác nhận. Dòng lỗi
            hoặc từ đã có trong thư viện sẽ không được nhập.
          </p>
          <VocabularyImportUploadForm />
        </section>
        <aside className="space-y-5">
          <section className="rounded-3xl bg-[#10243e] p-7 text-white">
            <h2 className="text-2xl font-black">1. Tải tệp mẫu</h2>
            <p className="mt-2 leading-7 text-blue-100">
              Giữ nguyên tên cột. Các đáp án thay thế ngăn cách bằng dấu |.
            </p>
            <a
              href="/templates/vocabulary-import-template.csv"
              download
              className="mt-5 inline-flex rounded-xl bg-white px-5 py-3 font-black text-[#10243e]"
            >
              Tải CSV mẫu ↓
            </a>
          </section>
          <section className="surface-card bg-white p-6">
            <h2 className="text-xl font-black">Quy trình an toàn</h2>
            <ol className="mt-4 space-y-3 text-sm font-semibold text-ink-600">
              <li>1. Soạn nội dung trong Excel hoặc Google Sheets.</li>
              <li>2. Tải file lên để kiểm tra lỗi và từ đã tồn tại.</li>
              <li>3. Xem trước toàn bộ kết quả.</li>
              <li>4. Xác nhận để tạo các từ ở trạng thái bản nháp.</li>
            </ol>
          </section>
        </aside>
      </div>
    </main>
  );
}
