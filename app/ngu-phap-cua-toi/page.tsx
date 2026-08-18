import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GrammarListsManager } from "@/features/grammar-lists/grammar-lists-manager";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Bộ ngữ pháp của tôi" };
export const dynamic = "force-dynamic";
export default async function MyGrammarPage() {
  if (!isSupabaseConfigured()) redirect("/dang-nhap?next=%2Fngu-phap-cua-toi");
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/dang-nhap?next=%2Fngu-phap-cua-toi");
  return <main className="min-h-screen bg-[radial-gradient(circle_at_10%_0%,#dff4ff_0,transparent_32rem),linear-gradient(145deg,#f8fbff,#f1f7fa)] px-4 py-6 sm:px-6 sm:py-10"><section className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-white bg-white/95 p-6 shadow-[0_24px_70px_rgba(16,36,62,.12)] sm:p-10"><div className="flex flex-wrap items-start justify-between gap-4"><div><Link href="/" className="mb-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-brand-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-sky-50">← Quay về trang chủ</Link><p className="text-sm font-black uppercase tracking-widest text-brand-600">Thư viện cá nhân</p><h1 className="mt-2 text-3xl font-black text-ink-900">Bộ ngữ pháp của tôi</h1><p className="mt-2 max-w-2xl text-ink-600">Tạo các bộ ngữ pháp theo mục tiêu, lưu cấu trúc ở bất kỳ bài học nào và luyện lại bằng trắc nghiệm hoặc nối từ.</p></div><Link href="/courses/topik-1" className="rounded-2xl bg-sky-50 px-5 py-3 font-black text-brand-700 ring-1 ring-sky-100 transition hover:-translate-y-0.5 hover:bg-sky-100">Tìm ngữ pháp trong bài học</Link></div><GrammarListsManager /></section></main>;
}
