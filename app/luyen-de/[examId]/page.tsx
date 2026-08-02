import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { startExam } from "@/features/exams/actions";

export default async function ExamInstructionsPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;
  const admin = createAdminClient();
  const { data: exam } = await admin.from("exam_sets").select("id,title,description,duration_minutes,instructions,exam_questions(count)").eq("id", examId).eq("status", "published").maybeSingle();
  if (!exam) notFound();
  const count = exam.exam_questions?.[0]?.count ?? 0;
  return <main className="elegant-blue min-h-screen text-[#10243e]"><div className="mx-auto max-w-4xl px-5 py-10"><Link href="/luyen-de" className="font-black text-[#087eba]">← Danh sách đề</Link><section className="mt-6 overflow-hidden rounded-[2rem] bg-white shadow-2xl"><div className="bg-gradient-to-r from-[#10243e] to-[#087eba] p-8 text-white"><p className="text-xs font-black uppercase tracking-[.2em] text-cyan-200">Trước khi bắt đầu</p><h1 className="mt-3 text-4xl font-black">{exam.title}</h1><p className="mt-3 text-blue-100">{exam.description}</p></div><div className="p-7 md:p-9"><div className="grid gap-4 sm:grid-cols-3"><Info value={`${count}`} label="Câu nghe" /><Info value={`${exam.duration_minutes}`} label="Phút" /><Info value="1" label="Đáp án mỗi câu" /></div><div className="mt-7 rounded-2xl bg-sky-50 p-5"><h2 className="font-black">Nguyên tắc làm bài</h2><p className="mt-2 whitespace-pre-line leading-7 text-slate-600">{exam.instructions || "Mỗi câu có một audio riêng. Chọn một đáp án đúng. Hết giờ hệ thống sẽ tự nộp bài."}</p><ul className="mt-3 list-disc space-y-1 pl-5 font-semibold text-slate-600"><li>Kiểm tra loa trước khi bắt đầu.</li><li>Đáp án được lưu ngay khi bạn chọn.</li><li>Câu đã trả lời sẽ chuyển sang màu xanh.</li><li>Tải lại trang không làm thời gian quay về ban đầu.</li></ul></div><form action={startExam} className="mt-7"><input type="hidden" name="examId" value={exam.id} /><button className="w-full rounded-2xl bg-[#087eba] px-6 py-4 text-lg font-black text-white shadow-lg">Bắt đầu làm bài →</button></form></div></section></div></main>;
}

function Info({ value, label }: { value: string; label: string }) { return <div className="rounded-2xl bg-slate-50 p-5 text-center"><strong className="block text-3xl text-[#087eba]">{value}</strong><span className="mt-1 block text-sm font-bold text-slate-500">{label}</span></div>; }
