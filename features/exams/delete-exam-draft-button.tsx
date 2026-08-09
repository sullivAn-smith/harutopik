"use client";

import { useFormStatus } from "react-dom";
import { deleteExamDraft } from "./actions";

function DeleteButton({ title }: { title: string }) {
  const { pending } = useFormStatus();
  return <button
    type="submit"
    disabled={pending}
    className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-black text-red-700 transition hover:border-red-300 hover:bg-red-100 disabled:cursor-wait disabled:opacity-60"
  >
    {pending ? "Đang xóa..." : "Xóa bản nháp"}
    <span className="sr-only"> {title}</span>
  </button>;
}

export function DeleteExamDraftButton({ examId, title }: { examId: string; title: string }) {
  return <form
    action={deleteExamDraft}
    onSubmit={(event) => {
      if (!window.confirm(`Xóa vĩnh viễn bản nháp “${title}”? Ảnh, audio và nội dung của bản nháp này cũng sẽ bị xóa.`)) event.preventDefault();
    }}
  >
    <input type="hidden" name="examId" value={examId} />
    <DeleteButton title={title} />
  </form>;
}
