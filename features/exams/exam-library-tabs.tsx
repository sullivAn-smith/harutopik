import Link from "next/link";

export function ExamLibraryTabs({ active }: { active: "exams" | "history" }) {
  return (
    <nav aria-label="Luyện đề" className="mt-7 inline-flex rounded-2xl border border-white/80 bg-white/75 p-1.5 shadow-lg backdrop-blur">
      <Link href="/luyen-de" aria-current={active === "exams" ? "page" : undefined} className={`rounded-xl px-6 py-3 font-black transition ${active === "exams" ? "bg-[#087eba] text-white shadow-md" : "text-slate-500 hover:bg-sky-50 hover:text-[#087eba]"}`}>Đề thi</Link>
      <Link href="/luyen-de/lich-su" aria-current={active === "history" ? "page" : undefined} className={`rounded-xl px-6 py-3 font-black transition ${active === "history" ? "bg-[#087eba] text-white shadow-md" : "text-slate-500 hover:bg-sky-50 hover:text-[#087eba]"}`}>Lịch sử</Link>
    </nav>
  );
}
