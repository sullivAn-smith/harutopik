import Link from "next/link";
import { redirect } from "next/navigation";
import { coursePath } from "@/content/catalog";
import { getPublishedCourses } from "@/lib/data/published-catalog";

export const dynamic = "force-dynamic";

export default async function BookLevel({ params }: { params: Promise<{ level: string }> }) {
  const { level } = await params;
  const courses = await getPublishedCourses();
  const publishedCourse = courses.find((course) => course.slug === `topik-${level}`);
  if (publishedCourse) redirect(coursePath(publishedCourse));
  return <main className="elegant-blue min-h-screen text-[#101820]"><div className="mx-auto max-w-4xl px-6 py-10 md:px-8"><Link href="/tieng-han-th" className="inline-flex rounded-full border border-white/70 bg-white/60 px-4 py-2 font-black shadow-sm">← Chọn TH</Link><section className="mt-8 rounded-3xl border-2 border-[#10243e] bg-white p-8 shadow-[6px_7px_0_#10243e] md:p-10"><p className="inline-flex rounded-xl bg-blue-600 px-4 py-2 text-xl font-black text-white">Tiếng Hàn TH {level}</p><div className="mt-8 inline-flex rounded-2xl border-2 border-orange-700 bg-yellow-300 px-5 py-3 text-2xl font-black text-orange-950 shadow-[4px_4px_0_#10243e]">SẮP RA MẮT</div><h1 className="mt-5 text-4xl font-black">Nội dung TH{level}</h1><p className="mt-3 text-lg leading-8 text-[#10243e]/70">Nội dung bài học của TH{level} đang được chuẩn bị. Bạn có thể quay lại chọn TH1 để bắt đầu học.</p><Link href="/tieng-han-th" className="mt-7 inline-flex rounded-xl bg-[#10243e] px-5 py-3 font-black text-white">Xem các TH khác →</Link></section></div></main>;
}
