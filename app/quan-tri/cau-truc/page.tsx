import {
  createCourseStructure,
  createModuleStructure,
} from "@/features/admin/catalog-actions";
import { getCatalogStructureOptions } from "@/lib/data/admin";

const inputClass =
  "mt-2 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 font-semibold outline-none focus:border-brand-500";

export default async function CatalogStructurePage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; error?: string }>;
}) {
  const [entries, query] = await Promise.all([
    getCatalogStructureOptions(),
    searchParams,
  ]);
  const courses = entries.filter((entry) => entry.type === "course");
  const modules = entries.filter((entry) => entry.type === "module");
  return (
    <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <p className="text-sm font-black uppercase tracking-widest text-cyan-700">
        Cấu trúc catalog
      </p>
      <h1 className="mt-2 text-4xl font-black">Khóa học và chương</h1>
      <p className="mt-3 max-w-3xl leading-7 text-ink-600">
        Admin tạo cấu trúc một lần. Content editor chỉ chọn khóa và chương khi
        soạn bài, không cần nhập ID kỹ thuật.
      </p>
      {query.created && (
        <p className="mt-6 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-800">
          Đã tạo {query.created === "course" ? "khóa học" : "chương"} và công
          khai cấu trúc cho catalog.
        </p>
      )}
      {query.error && (
        <p className="mt-6 rounded-2xl bg-red-50 p-4 font-bold text-red-700">
          Không thể tạo cấu trúc. Hãy kiểm tra ID, slug và dữ liệu trùng.
        </p>
      )}
      <section className="mt-8 grid gap-6 xl:grid-cols-2">
        <form action={createCourseStructure} className="surface-card bg-white p-6">
          <h2 className="text-2xl font-black">Tạo khóa học</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="font-bold">ID ổn định<input name="id" required placeholder="course-topik-2" className={inputClass} /></label>
            <label className="font-bold">Slug URL<input name="slug" required placeholder="topik-2" className={inputClass} /></label>
            <label className="font-bold">Tên tiếng Việt<input name="titleVi" required className={inputClass} /></label>
            <label className="font-bold">Tên tiếng Hàn<input name="titleKo" lang="ko" required className={inputClass} /></label>
            <label className="font-bold">Trình độ<select name="level" className={inputClass}><option value="beginner">Sơ cấp</option><option value="intermediate">Trung cấp</option><option value="advanced">Cao cấp</option></select></label>
            <label className="font-bold">Số bài dự kiến<input name="lessonCount" type="number" min={1} defaultValue={15} required className={inputClass} /></label>
          </div>
          <label className="mt-4 block font-bold">Mô tả khóa học<textarea name="summary" minLength={10} required rows={3} className={inputClass} /></label>
          <button className="mt-5 w-full rounded-2xl bg-brand-600 px-5 py-3 font-black text-white">Tạo khóa học</button>
        </form>
        <form action={createModuleStructure} className="surface-card bg-white p-6">
          <h2 className="text-2xl font-black">Tạo chương / học phần</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="font-bold">Thuộc khóa học<select name="courseId" required className={inputClass}>{courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label>
            <label className="font-bold">Thứ tự<input name="sortOrder" type="number" min={1} defaultValue={modules.length + 1} required className={inputClass} /></label>
            <label className="font-bold">ID ổn định<input name="id" required placeholder="module-topik-2-foundation" className={inputClass} /></label>
            <label className="font-bold">Slug<input name="slug" required placeholder="nen-tang" className={inputClass} /></label>
            <label className="font-bold">Tên tiếng Việt<input name="titleVi" required className={inputClass} /></label>
            <label className="font-bold">Tên tiếng Hàn<input name="titleKo" lang="ko" required className={inputClass} /></label>
          </div>
          <button disabled={courses.length === 0} className="mt-5 w-full rounded-2xl bg-[#10243e] px-5 py-3 font-black text-white disabled:bg-slate-300">Tạo chương</button>
        </form>
      </section>
      <section className="surface-card mt-7 bg-white p-6">
        <h2 className="text-2xl font-black">Cấu trúc hiện tại</h2>
        <div className="mt-5 space-y-5">
          {courses.map((course) => (
            <article key={course.id} className="rounded-2xl border p-5">
              <h3 className="text-xl font-black">{course.title}</h3>
              <p className="mt-1 text-xs font-semibold text-ink-400">{course.id}</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {modules.filter((module) => module.parentId === course.id).map((module) => (
                  <div key={module.id} className="rounded-xl bg-slate-50 p-4">
                    <p className="font-black">{module.title}</p>
                    <p className="mt-1 text-xs text-ink-600">{module.id}</p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
