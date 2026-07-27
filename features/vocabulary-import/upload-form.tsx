"use client";

import { useActionState } from "react";
import {
  type VocabularyImportState,
  uploadVocabularyImport,
} from "./actions";

const initialVocabularyImportState: VocabularyImportState = {
  status: "idle",
};

export function VocabularyImportUploadForm() {
  const [state, action, pending] = useActionState(
    uploadVocabularyImport,
    initialVocabularyImportState,
  );
  return (
    <form action={action} className="mt-6 space-y-5">
      {state.message && (
        <p role="alert" className="rounded-2xl bg-red-50 p-4 font-bold text-red-700">
          {state.message}
        </p>
      )}
      <label className="block rounded-3xl border-2 border-dashed border-brand-300 bg-sky-50 p-7 text-center">
        <span className="block text-lg font-black">Chọn tệp từ vựng</span>
        <span className="mt-2 block text-sm text-ink-600">
          CSV hoặc XLSX, tối đa 5 MB và 5.000 dòng
        </span>
        <input
          type="file"
          name="file"
          accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          required
          className="mx-auto mt-5 block max-w-full rounded-xl bg-white p-3 text-sm font-bold"
        />
      </label>
      <button
        disabled={pending}
        className="w-full rounded-2xl bg-brand-600 px-6 py-4 font-black text-white disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Đang đọc và kiểm tra tệp..." : "Kiểm tra dữ liệu trước khi nhập"}
      </button>
    </form>
  );
}
