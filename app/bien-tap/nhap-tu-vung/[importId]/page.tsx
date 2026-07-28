import Link from "next/link";
import { notFound } from "next/navigation";
import { commitVocabularyImport } from "@/features/vocabulary-import/actions";
import { getVocabularyImport } from "@/lib/data/vocabulary-import";

const labels: Record<string, string> = {
  valid: "Hợp lệ",
  invalid: "Có lỗi",
  duplicate: "Bị trùng",
  imported: "Đã nhập",
  skipped: "Đã bỏ qua",
};

const colors: Record<string, string> = {
  valid: "bg-emerald-100 text-emerald-800",
  invalid: "bg-red-100 text-red-800",
  duplicate: "bg-amber-100 text-amber-800",
  imported: "bg-blue-100 text-blue-800",
  skipped: "bg-slate-100 text-slate-700",
};

export default async function VocabularyImportPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ importId: string }>;
  searchParams: Promise<{ completed?: string; error?: string }>;
}) {
  const { importId } = await params;
  const query = await searchParams;
  const result = await getVocabularyImport(importId);
  if (!result) notFound();
  const { batch, rows } = result;
  const completed = batch.status === "completed";
  return (
    <main className="mx-auto max-w-7xl px-5 py-10">
      <Link href="/bien-tap/nhap-tu-vung" className="text-sm font-black text-brand-700">
        ← Nhập tệp khác
      </Link>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-sm font-black uppercase tracking-widest text-brand-600">
            {completed ? "Đã hoàn tất" : "Xem trước trước khi nhập"}
          </p>
          <h1 className="mt-2 text-3xl font-black">{batch.fileName}</h1>
          <p className="mt-2 text-ink-600">
            Chưa có dòng nào được ghi vào thư viện khi bạn chưa xác nhận.
          </p>
        </div>
        {completed ? (
          <Link href="/bien-tap/tu-vung" className="rounded-2xl bg-brand-600 px-6 py-3 font-black text-white">
            Xem thư viện từ →
          </Link>
        ) : (
          <form action={commitVocabularyImport}>
            <input type="hidden" name="importId" value={batch.id} />
            <button
              disabled={batch.validRows === 0}
              className="rounded-2xl bg-brand-600 px-6 py-3 font-black text-white disabled:bg-slate-300"
            >
              Xác nhận nhập {batch.validRows} từ hợp lệ
            </button>
          </form>
        )}
      </div>
      {query.error && (
        <p role="alert" className="mt-5 rounded-2xl bg-red-50 p-4 font-bold text-red-700">
          {query.error}
        </p>
      )}
      {(query.completed || completed) && (
        <p className="mt-5 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-800">
          Đã tạo {batch.validRows} từ vựng ở trạng thái bản nháp. Các dòng lỗi
          và trùng đã được bỏ qua.
        </p>
      )}
      <section className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Tổng số dòng", batch.totalRows, "bg-slate-50"],
          ["Sẵn sàng nhập", batch.validRows, "bg-emerald-50"],
          ["Có lỗi", batch.invalidRows, "bg-red-50"],
          ["Trùng dữ liệu", batch.duplicateRows, "bg-amber-50"],
        ].map(([label, value, color]) => (
          <div key={String(label)} className={`rounded-3xl border p-5 ${color}`}>
            <p className="text-sm font-bold text-ink-600">{label}</p>
            <p className="mt-2 text-3xl font-black">{value}</p>
          </div>
        ))}
      </section>
      {batch.invalidRows > 0 && !completed && (
        <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 font-semibold text-amber-900">
          Bạn vẫn có thể nhập các dòng hợp lệ. Hãy sửa những dòng báo lỗi trong
          Excel rồi tải lại ở một phiên mới nếu muốn nhập chúng.
        </p>
      )}
      <section className="surface-card mt-7 overflow-hidden bg-white">
        <div className="border-b p-5">
          <h2 className="text-xl font-black">Kết quả kiểm tra từng dòng</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-ink-600">
              <tr>
                <th className="p-4">Dòng</th>
                <th className="p-4">Tiếng Hàn</th>
                <th className="p-4">Nghĩa Việt</th>
                <th className="p-4">Phiên âm</th>
                <th className="p-4">Chủ đề</th>
                <th className="p-4">Trạng thái</th>
                <th className="p-4">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => (
                <tr key={row.id} className="align-top">
                  <td className="p-4 font-black">{row.rowNumber}</td>
                  <td lang="ko" className="p-4 text-lg font-black">{row.normalizedData.hangul}</td>
                  <td className="p-4 font-bold">{row.normalizedData.meaning_vi}</td>
                  <td className="p-4 text-ink-600">{row.normalizedData.romanization || "—"}</td>
                  <td className="p-4 text-ink-600">{row.normalizedData.category || "general"}</td>
                  <td className="p-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${colors[row.rowStatus] ?? colors.skipped}`}>
                      {labels[row.rowStatus] ?? row.rowStatus}
                    </span>
                  </td>
                  <td className="max-w-sm p-4 text-ink-600">
                    {row.validationErrors.length > 0
                      ? row.validationErrors.join(" ")
                      : row.duplicateOf ?? (row.importedVocabularyId ? "Đã tạo bản nháp." : "Sẵn sàng nhập.")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
