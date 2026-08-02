"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { VocabularyAdminItem } from "@/lib/data/vocabulary-admin";
import { VocabularyImageUpload } from "@/features/vocabulary-admin/vocabulary-image-upload";
import {
  applyVocabularyHotfix,
} from "./vocabulary-hotfix-actions";
import { SentenceAudioButton } from "./sentence-audio-button";

const fieldClass =
  "mt-2 w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 font-semibold outline-none focus:border-violet-500";

function FieldError({
  state,
  name,
}: {
  state: { fields?: Record<string, string[]> };
  name: string;
}) {
  const message = state.fields?.[name]?.[0];
  return message ? (
    <p className="mt-2 text-sm font-bold text-red-600">{message}</p>
  ) : null;
}

export function PublishedVocabularyHotfixForm({
  contentId,
  item,
  nextHref,
}: {
  contentId: string;
  item: VocabularyAdminItem;
  nextHref: string;
}) {
  const [state, action, pending] = useActionState(
    applyVocabularyHotfix,
    { status: "idle" as const },
  );
  const [examples, setExamples] = useState(item.examples ?? []);
  const [dirty, setDirty] = useState(false);
  return (
    <form
      action={action}
      onChangeCapture={() => setDirty(true)}
      className="space-y-6"
    >
      <input type="hidden" name="contentId" value={contentId} />
      <input type="hidden" name="vocabularyId" value={item.id} />
      <input type="hidden" name="examplesJson" value={JSON.stringify(examples)} />
      {state.message && <p role="alert" className="rounded-2xl bg-red-50 p-4 font-bold text-red-700">{state.message}</p>}
      <section className="rounded-3xl border bg-white p-6">
        <h2 className="text-2xl font-black">Nội dung từ</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="font-black">Tiếng Hàn
            <input name="hangul" lang="ko" defaultValue={item.hangul} className={fieldClass} />
            <FieldError state={state} name="hangul" />
          </label>
          <label className="font-black">Nghĩa tiếng Việt
            <input name="meaningVi" defaultValue={item.meaningVi} className={fieldClass} />
            <FieldError state={state} name="meaningVi" />
          </label>
          <label className="font-black">Phiên âm
            <input name="romanization" defaultValue={item.romanization} className={fieldClass} />
            <FieldError state={state} name="romanization" />
          </label>
          <label className="font-black">Từ loại
            <select name="partOfSpeech" defaultValue={item.partOfSpeech ?? ""} className={fieldClass}>
              <option value="">Chưa xác định</option>
              <option>Danh từ</option>
              <option>Động từ</option>
              <option>Tính từ</option>
              <option>Trạng từ</option>
              <option>Đại từ</option>
              <option>Biểu hiện</option>
            </select>
            <FieldError state={state} name="partOfSpeech" />
          </label>
          <label className="font-black">Trình độ
            <select name="level" defaultValue={item.level} className={fieldClass}>
              <option value="beginner">Sơ cấp</option>
              <option value="intermediate">Trung cấp</option>
              <option value="advanced">Cao cấp</option>
            </select>
            <FieldError state={state} name="level" />
          </label>
          <label className="font-black">Chủ đề
            <input name="category" defaultValue={item.category} className={fieldClass} />
            <FieldError state={state} name="category" />
          </label>
        </div>
      </section>
      <section className="rounded-3xl border bg-slate-50 p-6">
        <h2 className="text-2xl font-black">Đáp án được chấp nhận</h2>
        <p className="mt-2 text-sm leading-6 text-ink-600">
          Mỗi dòng là một cách trả lời đúng. Các đáp án này được dùng cho bài
          dịch và gõ từ.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="font-black">
            Khi dịch sang tiếng Việt
            <textarea
              name="acceptedVi"
              rows={5}
              defaultValue={item.acceptedVi?.join("\n")}
              className={fieldClass}
            />
            <FieldError state={state} name="acceptedVi" />
          </label>
          <label className="font-black">
            Khi dịch sang tiếng Hàn
            <textarea
              name="acceptedKo"
              lang="ko"
              rows={5}
              defaultValue={item.acceptedKo?.join("\n")}
              className={fieldClass}
            />
            <FieldError state={state} name="acceptedKo" />
          </label>
        </div>
      </section>
      <section className="rounded-3xl border border-sky-200 bg-sky-50 p-6">
        <h2 className="text-2xl font-black">Ảnh minh họa</h2>
        <p className="mt-2 text-sm text-ink-600">Ảnh mới được tải lên Supabase Storage và phục vụ qua CDN.</p>
        <VocabularyImageUpload defaultValue={item.imageUrl} />
        <FieldError state={state} name="imageUrl" />
      </section>
      <section className="rounded-3xl border border-violet-200 bg-violet-50 p-6">
        <h2 className="text-2xl font-black">Câu ví dụ và audio Azure</h2>
        <p className="mt-2 text-sm leading-6 text-ink-600">
          Nút loa bên dưới thẻ từ của learner dùng audio này. Khi sửa câu,
          audio cũ được bỏ để tránh phát sai và cần tạo lại Azure.
        </p>
        <div className="mt-5 space-y-4">
          {examples.map((example, index) => (
            <article key={example.id} className="rounded-2xl border bg-white p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="font-black">
                  Câu tiếng Hàn
                  <input
                    lang="ko"
                    value={example.korean}
                    onChange={(event) =>
                      setExamples((items) =>
                        items.map((item, itemIndex) =>
                          itemIndex === index
                            ? {
                                ...item,
                                korean: event.target.value,
                                audioUrl: null,
                              }
                            : item,
                        ),
                      )
                    }
                    className={fieldClass}
                  />
                </label>
                <label className="font-black">
                  Nghĩa tiếng Việt
                  <input
                    value={example.vietnamese}
                    onChange={(event) =>
                      setExamples((items) =>
                        items.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, vietnamese: event.target.value }
                            : item,
                        ),
                      )
                    }
                    className={fieldClass}
                  />
                </label>
              </div>
              <div className="mt-3">
                <SentenceAudioButton
                  text={example.korean}
                  currentAudioUrl={example.audioUrl ?? undefined}
                  onGenerated={(audioUrl) => {
                    setDirty(true);
                    setExamples((items) =>
                      items.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, audioUrl } : item,
                      ),
                    );
                  }}
                />
              </div>
            </article>
          ))}
        </div>
      </section>
      {dirty ? (
        <>
          <label className="block rounded-3xl border border-amber-200 bg-amber-50 p-6 font-black">
            Lý do chỉnh sửa
            <textarea name="reason" required rows={2} placeholder="Ví dụ: Thay ảnh minh họa bị sai." className={fieldClass} />
            <FieldError state={state} name="reason" />
          </label>
          <button disabled={pending} className="w-full rounded-2xl bg-violet-700 px-6 py-4 text-lg font-black text-white disabled:opacity-60">
            {pending ? "Đang lưu…" : "Lưu thay đổi"}
          </button>
          <p className="text-center text-sm font-bold text-amber-700">
            Hãy lưu thay đổi trước khi chuyển sang từ tiếp theo.
          </p>
        </>
      ) : (
        <Link
          href={nextHref}
          className="flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-violet-700 to-blue-600 px-6 py-4 text-lg font-black text-white shadow-lg transition hover:-translate-y-0.5"
        >
          Tiếp theo →
        </Link>
      )}
    </form>
  );
}
