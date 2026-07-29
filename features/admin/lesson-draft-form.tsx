"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  createLessonDraft,
  updateLessonDraft,
} from "@/features/admin/content-actions";
import {
  initialContentFormState,
  type ContentFormState,
} from "@/features/admin/content-schema";
import type { CatalogStructureOption } from "@/lib/data/admin";

function FieldError({
  state,
  name,
}: {
  state: ContentFormState;
  name: string;
}) {
  const error = state.fields?.[name]?.[0];
  return error ? (
    <p className="mt-2 text-sm font-bold text-red-600">{error}</p>
  ) : null;
}

const inputClass =
  "mt-2 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 font-semibold outline-none focus:border-brand-500";

export type LessonDraftDefaults = {
  id: string;
  slug: string;
  courseId: string;
  moduleId: string;
  order: number;
  version: number;
  titleVi: string;
  titleKo: string;
  summary: string;
  objectives: string;
  vocabulary: string;
  grammar: Array<{
    title: string;
    form: string;
    explanation: string;
    formula: string;
    examples: Array<{ korean: string; vietnamese: string }>;
  }>;
  changeSummary: string;
};

export function LessonDraftForm({
  revisionId,
  defaults,
  returnTo,
  reviewEdit = false,
  catalogOptions = [],
}: {
  revisionId?: string;
  defaults?: LessonDraftDefaults;
  returnTo?: "/bien-tap/noi-dung" | "/quan-tri/noi-dung";
  reviewEdit?: boolean;
  catalogOptions?: CatalogStructureOption[];
}) {
  const editing = Boolean(revisionId);
  const [state, formAction, pending] = useActionState(
    editing ? updateLessonDraft : createLessonDraft,
    initialContentFormState,
  );
  const courses = catalogOptions.filter((item) => item.type === "course");
  const modules = catalogOptions.filter((item) => item.type === "module");
  const [grammar, setGrammar] = useState(defaults?.grammar ?? []);

  return (
    <form action={formAction} className="space-y-8">
      {revisionId && <input type="hidden" name="revisionId" value={revisionId} />}
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
      {reviewEdit && <input type="hidden" name="reviewEdit" value="1" />}
      {defaults && <input type="hidden" name="version" value={defaults.version} />}
      <input type="hidden" name="grammarJson" value={JSON.stringify(grammar)} />
      {state.message && (
        <p
          role="alert"
          className="rounded-2xl bg-red-50 px-4 py-3 font-bold text-red-700"
        >
          {state.message}
        </p>
      )}

      <fieldset>
        <legend className="text-xl font-black">Định danh và vị trí</legend>
        <p className="mt-1 text-sm text-ink-600">
          Các ID ổn định sẽ được website và ứng dụng dùng để đồng bộ tiến độ.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="font-bold">
            ID bài học
            <input
              name="id"
              required
              readOnly={editing}
              defaultValue={defaults?.id}
              placeholder="lesson-topik-1-02"
              className={inputClass}
            />
            <FieldError state={state} name="id" />
          </label>
          <label className="font-bold">
            Slug URL
            <input
              name="slug"
              required
              defaultValue={defaults?.slug}
              placeholder="quoc-tich-va-nghe-nghiep"
              className={inputClass}
            />
            <FieldError state={state} name="slug" />
          </label>
          <label className="font-bold">
            Khóa học
            <select
              name="courseId"
              required
              defaultValue={defaults?.courseId ?? "course-topik-1"}
              className={inputClass}
            >
              {courses.map((course) => (
                <option key={course.id} value={course.id}>{course.title}</option>
              ))}
            </select>
            <FieldError state={state} name="courseId" />
          </label>
          <label className="font-bold">
            Chương / học phần
            <select
              name="moduleId"
              required
              defaultValue={defaults?.moduleId ?? "module-topik-1-foundation"}
              className={inputClass}
            >
              {modules.map((module) => (
                <option key={module.id} value={module.id}>{module.title}</option>
              ))}
            </select>
            <FieldError state={state} name="moduleId" />
          </label>
          <label className="font-bold">
            Thứ tự bài
            <input
              name="order"
              type="number"
              min={1}
              required
              defaultValue={defaults?.order ?? 2}
              className={inputClass}
            />
            <FieldError state={state} name="order" />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-xl font-black">Thông tin hiển thị</legend>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="font-bold">
            Tên tiếng Việt
            <input
              name="titleVi"
              required
              defaultValue={defaults?.titleVi}
              placeholder="Quốc tịch và nghề nghiệp"
              className={inputClass}
            />
            <FieldError state={state} name="titleVi" />
          </label>
          <label className="font-bold">
            Tên tiếng Hàn
            <input
              name="titleKo"
              required
              defaultValue={defaults?.titleKo}
              lang="ko"
              placeholder="국적과 직업"
              className={inputClass}
            />
            <FieldError state={state} name="titleKo" />
          </label>
        </div>
        <label className="mt-4 block font-bold">
          Mô tả ngắn
          <textarea
            name="summary"
            required
            defaultValue={defaults?.summary}
            rows={3}
            placeholder="Người học sẽ đạt được gì sau bài này?"
            className={inputClass}
          />
          <FieldError state={state} name="summary" />
        </label>
        <label className="mt-4 block font-bold">
          Mục tiêu bài học — mỗi dòng một mục tiêu
          <textarea
            name="objectives"
            required
            defaultValue={defaults?.objectives}
            rows={4}
            placeholder={"Nhận biết tên các quốc gia.\nHỏi và trả lời về quốc tịch."}
            className={inputClass}
          />
          <FieldError state={state} name="objectives" />
        </label>
      </fieldset>

      <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5">
        <input type="hidden" name="vocabulary" value={defaults?.vocabulary ?? ""} />
        <h2 className="text-xl font-black">Bộ từ vựng</h2>
        <p className="mt-2 leading-7 text-ink-600">
          Từ vựng được quản lý trong thư viện dùng chung. Bạn chỉ cần chọn các
          từ cho bài, không phải nhập lại cho từng dạng luyện tập.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-brand-700">
            {defaults?.vocabulary
              ? `${defaults.vocabulary.split("\n").filter(Boolean).length} từ hiện tại`
              : "Chưa chọn từ"}
          </span>
          {revisionId ? (
            <Link
              href={`/bien-tap/noi-dung/${revisionId}/tu-vung`}
              className="rounded-xl bg-[#10243e] px-4 py-2 font-black text-white"
            >
              Chọn từ trong thư viện →
            </Link>
          ) : (
            <span className="text-sm font-semibold text-ink-600">
              Sau khi tạo bản nháp, bạn sẽ được chọn từ trong thư viện.
            </span>
          )}
        </div>
        <FieldError state={state} name="vocabulary" />
      </section>

      <section className="rounded-3xl border border-violet-200 bg-violet-50 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">Điểm ngữ pháp</h2>
            <p className="mt-2 leading-7 text-ink-600">
              Thêm cấu trúc, cách dùng và ví dụ. Nội dung này đi cùng phiên bản
              bài học và sẽ xuất hiện cho người học sau khi phát hành.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setGrammar((items) => [
                ...items,
                {
                  title: "",
                  form: "",
                  explanation: "",
                  formula: "",
                  examples: [{ korean: "", vietnamese: "" }],
                },
              ])
            }
            className="rounded-xl bg-violet-700 px-4 py-2 font-black text-white"
          >
            + Thêm ngữ pháp
          </button>
        </div>
        <div className="mt-5 space-y-5">
          {grammar.map((point, pointIndex) => (
            <article key={pointIndex} className="rounded-2xl border bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-black">Điểm ngữ pháp {pointIndex + 1}</h3>
                <button
                  type="button"
                  onClick={() =>
                    setGrammar((items) =>
                      items.filter((_, index) => index !== pointIndex),
                    )
                  }
                  className="text-sm font-black text-red-700"
                >
                  Xóa
                </button>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {[
                  ["title", "Tên dễ hiểu", "Tiểu từ chủ đề"],
                  ["form", "Cấu trúc tiếng Hàn", "은/는"],
                  ["formula", "Công thức", "Danh từ + 은/는"],
                ].map(([field, label, placeholder]) => (
                  <label key={field} className="font-bold">
                    {label}
                    <input
                      value={point[field as "title" | "form" | "formula"]}
                      onChange={(event) =>
                        setGrammar((items) =>
                          items.map((item, index) =>
                            index === pointIndex
                              ? { ...item, [field]: event.target.value }
                              : item,
                          ),
                        )
                      }
                      placeholder={placeholder}
                      className={inputClass}
                    />
                  </label>
                ))}
              </div>
              <label className="mt-4 block font-bold">
                Giải thích bằng tiếng Việt
                <textarea
                  value={point.explanation}
                  onChange={(event) =>
                    setGrammar((items) =>
                      items.map((item, index) =>
                        index === pointIndex
                          ? { ...item, explanation: event.target.value }
                          : item,
                      ),
                    )
                  }
                  rows={3}
                  className={inputClass}
                />
              </label>
              <div className="mt-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-black">Câu ví dụ</p>
                  <button
                    type="button"
                    onClick={() =>
                      setGrammar((items) =>
                        items.map((item, index) =>
                          index === pointIndex
                            ? {
                                ...item,
                                examples: [
                                  ...item.examples,
                                  { korean: "", vietnamese: "" },
                                ],
                              }
                            : item,
                        ),
                      )
                    }
                    className="text-sm font-black text-violet-700"
                  >
                    + Thêm ví dụ
                  </button>
                </div>
                <div className="mt-3 space-y-3">
                  {point.examples.map((example, exampleIndex) => (
                    <div key={exampleIndex} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                      <input
                        lang="ko"
                        aria-label={`Ví dụ tiếng Hàn ${exampleIndex + 1}`}
                        value={example.korean}
                        onChange={(event) =>
                          setGrammar((items) =>
                            items.map((item, index) =>
                              index === pointIndex
                                ? {
                                    ...item,
                                    examples: item.examples.map((entry, entryIndex) =>
                                      entryIndex === exampleIndex
                                        ? { ...entry, korean: event.target.value }
                                        : entry,
                                    ),
                                  }
                                : item,
                            ),
                          )
                        }
                        placeholder="저는 학생이에요."
                        className="rounded-xl border-2 border-slate-200 px-4 py-3 font-semibold"
                      />
                      <input
                        aria-label={`Nghĩa ví dụ ${exampleIndex + 1}`}
                        value={example.vietnamese}
                        onChange={(event) =>
                          setGrammar((items) =>
                            items.map((item, index) =>
                              index === pointIndex
                                ? {
                                    ...item,
                                    examples: item.examples.map((entry, entryIndex) =>
                                      entryIndex === exampleIndex
                                        ? { ...entry, vietnamese: event.target.value }
                                        : entry,
                                    ),
                                  }
                                : item,
                            ),
                          )
                        }
                        placeholder="Tôi là học sinh."
                        className="rounded-xl border-2 border-slate-200 px-4 py-3 font-semibold"
                      />
                      <button
                        type="button"
                        aria-label={`Xóa ví dụ ${exampleIndex + 1}`}
                        onClick={() =>
                          setGrammar((items) =>
                            items.map((item, index) =>
                              index === pointIndex
                                ? {
                                    ...item,
                                    examples: item.examples.filter(
                                      (_, entryIndex) => entryIndex !== exampleIndex,
                                    ),
                                  }
                                : item,
                            ),
                          )
                        }
                        className="rounded-xl border px-3 font-black text-red-700"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
        <FieldError state={state} name="grammarJson" />
      </section>

      <label className="block font-bold">
        Ghi chú thay đổi
        <input
          name="changeSummary"
          defaultValue={defaults?.changeSummary}
          placeholder="Ví dụ: Tạo khung nội dung bài 2"
          className={inputClass}
        />
      </label>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
        Bài mới được lưu ở trạng thái <strong>Bản nháp</strong>, chưa hiển thị
        cho người học cho đến khi hoàn tất quy trình duyệt và xuất bản.
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-2xl bg-brand-600 px-6 py-4 text-lg font-black text-white disabled:cursor-wait disabled:opacity-60"
      >
        {pending
          ? "Đang lưu bản nháp..."
          : editing
            ? "Lưu thay đổi"
            : "Tạo bản nháp bài học"}
      </button>
    </form>
  );
}
