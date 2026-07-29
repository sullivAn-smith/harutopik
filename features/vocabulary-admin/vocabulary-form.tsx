"use client";

import { useActionState, useState } from "react";
import {
  createVocabularyDraft,
  updateVocabularyDraft,
} from "./actions";
import {
  initialVocabularyFormState,
  type VocabularyFormState,
} from "./schema";
import { VocabularyImageUpload } from "./vocabulary-image-upload";

export type VocabularyFormDefaults = {
  id: string;
  hangul: string;
  romanization: string;
  meaningVi: string;
  partOfSpeech: string | null;
  level: string;
  category: string;
  audioUrl: string | null;
  imageUrl: string | null;
  acceptedVi: string[];
  acceptedKo: string[];
  examples: Array<{ korean: string; vietnamese: string }>;
};

const inputClass =
  "mt-2 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 font-semibold outline-none focus:border-brand-500";

function ErrorText({
  state,
  name,
}: {
  state: VocabularyFormState;
  name: string;
}) {
  const message = state.fields?.[name]?.[0];
  return message ? <p className="mt-2 text-sm font-bold text-red-600">{message}</p> : null;
}

export function VocabularyForm({
  defaults,
}: {
  defaults?: VocabularyFormDefaults;
}) {
  const editing = Boolean(defaults);
  const [examples, setExamples] = useState(
    defaults?.examples.length
      ? defaults.examples
      : [{ korean: "", vietnamese: "" }],
  );
  const [state, action, pending] = useActionState(
    editing ? updateVocabularyDraft : createVocabularyDraft,
    initialVocabularyFormState,
  );
  return (
    <form action={action} className="space-y-7">
      {defaults && <input type="hidden" name="vocabularyId" value={defaults.id} />}
      <input type="hidden" name="examplesJson" value={JSON.stringify(examples)} />
      {state.message && <p role="alert" className="rounded-2xl bg-red-50 p-4 font-bold text-red-700">{state.message}</p>}

      <section>
        <h2 className="text-xl font-black">Nội dung chính</h2>
        <p className="mt-1 text-sm text-ink-600">Đây là thông tin được sử dụng trong mọi dạng luyện tập.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="font-bold">Từ tiếng Hàn *
            <input name="hangul" lang="ko" required defaultValue={defaults?.hangul} placeholder="안녕하세요" className={inputClass} />
            <ErrorText state={state} name="hangul" />
          </label>
          <label className="font-bold">Nghĩa tiếng Việt *
            <input name="primaryMeaningVi" required defaultValue={defaults?.meaningVi} placeholder="Xin chào" className={inputClass} />
            <ErrorText state={state} name="primaryMeaningVi" />
          </label>
          <label className="font-bold">Phiên âm
            <input name="romanization" defaultValue={defaults?.romanization} placeholder="annyeonghaseyo" className={inputClass} />
          </label>
          <label className="font-bold">Từ loại
            <select name="partOfSpeech" defaultValue={defaults?.partOfSpeech ?? ""} className={inputClass}>
              <option value="">Chưa xác định</option>
              <option>Danh từ</option><option>Động từ</option><option>Tính từ</option>
              <option>Trạng từ</option><option>Đại từ</option><option>Biểu hiện</option>
            </select>
          </label>
          <label className="font-bold">Trình độ
            <select name="level" defaultValue={defaults?.level ?? "beginner"} className={inputClass}>
              <option value="beginner">Sơ cấp</option><option value="intermediate">Trung cấp</option><option value="advanced">Cao cấp</option>
            </select>
          </label>
          <label className="font-bold">Chủ đề
            <input name="category" required defaultValue={defaults?.category ?? "general"} placeholder="Chào hỏi" className={inputClass} />
          </label>
        </div>
      </section>

      <section className="rounded-3xl bg-slate-50 p-5">
        <h2 className="text-xl font-black">Đáp án được chấp nhận</h2>
        <p className="mt-1 text-sm text-ink-600">Mỗi dòng là một cách trả lời đúng. Nghĩa chính và Hangul luôn được thêm tự động.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="font-bold">Khi dịch sang tiếng Việt
            <textarea name="acceptedVi" rows={5} defaultValue={defaults?.acceptedVi.join("\n")} placeholder={"Chào bạn\nChào anh\nChào chị"} className={inputClass} />
          </label>
          <label className="font-bold">Khi dịch sang tiếng Hàn
            <textarea name="acceptedKo" lang="ko" rows={5} defaultValue={defaults?.acceptedKo.join("\n")} placeholder="안녕하세요" className={inputClass} />
          </label>
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-xl font-black">Câu ví dụ</h2><p className="mt-1 text-sm text-ink-600">Thêm ngữ cảnh để người học hiểu cách dùng từ.</p></div>
          <button type="button" onClick={() => setExamples((items) => [...items, { korean: "", vietnamese: "" }])} className="rounded-xl border bg-white px-4 py-2 text-sm font-black">+ Thêm câu ví dụ</button>
        </div>
        <div className="mt-4 grid gap-4">
          {examples.map((example, index) => (
            <div key={index} className="grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-[1fr_1fr_auto]">
              <label className="text-sm font-bold">Câu tiếng Hàn
                <input lang="ko" value={example.korean} onChange={(event) => setExamples((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, korean: event.target.value } : item))} className={inputClass} />
              </label>
              <label className="text-sm font-bold">Nghĩa tiếng Việt
                <input value={example.vietnamese} onChange={(event) => setExamples((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, vietnamese: event.target.value } : item))} className={inputClass} />
              </label>
              <button type="button" aria-label={`Xóa câu ví dụ ${index + 1}`} onClick={() => setExamples((items) => items.filter((_, itemIndex) => itemIndex !== index))} className="self-end rounded-xl border border-red-200 px-3 py-3 font-black text-red-700">Xóa</button>
            </div>
          ))}
        </div>
        <ErrorText state={state} name="examplesJson" />
      </section>

      <section className="rounded-3xl bg-blue-50 p-5">
        <h2 className="text-xl font-black">Audio phát âm</h2>
        <p className="mt-1 text-sm text-ink-600">Audio URL giúp từ tự động dùng được cho chép chính tả. Có thể để trống và bổ sung audio sau.</p>
        <div className="mt-4">
          <label className="font-bold">Audio URL
            <input name="audioUrl" type="url" defaultValue={defaults?.audioUrl ?? ""} placeholder="https://.../audio.mp3" className={inputClass} />
            <ErrorText state={state} name="audioUrl" />
          </label>
        </div>
      </section>

      <section className="rounded-3xl bg-gradient-to-br from-sky-50 to-cyan-50 p-5">
        <h2 className="text-xl font-black">Ảnh minh họa</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-ink-600">
          Chọn ảnh từ máy. Hệ thống sẽ tải trực tiếp lên Supabase Storage và
          người học xem ảnh qua CDN; bạn không cần tự tạo hoặc dán URL.
        </p>
        <VocabularyImageUpload defaultValue={defaults?.imageUrl} />
        <ErrorText state={state} name="imageUrl" />
      </section>

      <button disabled={pending} className="w-full rounded-2xl bg-brand-600 px-6 py-4 text-lg font-black text-white disabled:opacity-60">
        {pending ? "Đang lưu..." : editing ? "Lưu thay đổi" : "Tạo từ vựng"}
      </button>
    </form>
  );
}
