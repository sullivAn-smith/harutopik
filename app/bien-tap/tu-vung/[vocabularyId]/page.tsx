import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { deleteVocabularyDraft } from "@/features/vocabulary-admin/actions";
import { GenerateAudioButton } from "@/features/vocabulary-admin/generate-audio-button";
import { VocabularyForm } from "@/features/vocabulary-admin/vocabulary-form";
import { getVocabularyAdminItem } from "@/lib/data/vocabulary-admin";
import { getCurrentActor } from "@/lib/auth/authorize";

export default async function VocabularyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ vocabularyId: string }>;
  searchParams: Promise<{
    created?: string;
    updated?: string;
    audio?: string;
    delete?: string;
    errorMessage?: string;
  }>;
}) {
  const { vocabularyId } = await params;
  const [item, actor] = await Promise.all([
    getVocabularyAdminItem(vocabularyId),
    getCurrentActor(),
  ]);
  if (!item) notFound();
  const notice = await searchParams;
  const editable = ["draft", "changes_requested"].includes(item.status);
  const canGenerateAudio =
    Boolean(actor?.roles.includes("admin")) || item.createdBy === actor?.id;
  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <Link href="/bien-tap/tu-vung" className="text-sm font-black text-brand-700">← Thư viện từ vựng</Link>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-black uppercase tracking-widest text-brand-600">{item.status === "published" ? "Đang được sử dụng" : "Bản nháp"}</p><h1 lang="ko" className="mt-2 text-5xl font-black">{item.hangul}</h1><p className="mt-2 text-xl font-black text-orange-700">{item.meaningVi}</p></div><span className={`rounded-full px-4 py-2 text-sm font-black ${item.audioUrl ? "bg-violet-100 text-violet-800" : "bg-amber-100 text-amber-800"}`}>{item.audioUrl ? "Sẵn sàng chính tả" : "Chưa có audio"}</span></div>
      {(notice.created || notice.updated) && <p className="mt-6 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-800">Đã lưu từ vựng thành công.</p>}
      {["generated", "reused"].includes(notice.audio ?? "") && <p className="mt-6 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-800">Audio đã sẵn sàng trên CDN và có thể dùng cho bài chép chính tả.</p>}
      {notice.audio === "not-configured" && <p className="mt-6 rounded-2xl bg-amber-50 p-4 font-bold text-amber-900">Chưa cấu hình Azure Speech trên server.</p>}
      {["failed", "queue-failed"].includes(notice.audio ?? "") && <p className="mt-6 rounded-2xl bg-red-50 p-4 font-bold text-red-700">Chưa thể tạo audio. Hệ thống đã lưu trạng thái lỗi để bạn có thể thử lại.</p>}
      {notice.delete === "error" && (
        <p role="alert" className="mt-6 rounded-2xl bg-red-50 p-4 font-bold text-red-700">
          {notice.errorMessage ?? "Chưa thể xóa từ vựng."}
        </p>
      )}
      {canGenerateAudio && <section className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-violet-200 bg-violet-50 p-5"><div><h2 className="text-lg font-black">Audio phát âm tự động</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-ink-600">{item.audioUrl ? "Bấm “Tạo lại audio” để thay file cũ bằng giọng Azure. URL mới được lưu vào từ vựng và bài học đang dùng từ này sẽ nhận audio mới." : "Azure tạo một lần, sau đó web và app phát trực tiếp từ Supabase CDN."}</p></div><GenerateAudioButton vocabularyId={item.id} currentAudioUrl={item.audioUrl} /></section>}
      <section className="surface-card mt-7 bg-white p-6 sm:p-8">
        {editable ? <VocabularyForm defaults={{ id: item.id, hangul: item.hangul, romanization: item.romanization, meaningVi: item.meaningVi, partOfSpeech: item.partOfSpeech, level: item.level, category: item.category, audioUrl: item.audioUrl, imageUrl: item.imageUrl, acceptedVi: item.acceptedVi, acceptedKo: item.acceptedKo, examples: item.examples }} /> : <div className="py-12 text-center"><h2 className="text-2xl font-black">Từ đã xuất bản được bảo vệ</h2><p className="mt-2 text-ink-600">Từ đang được dùng trong bài học nên không thể chỉnh sửa trực tiếp ở phiên bản hiện tại.</p></div>}
      </section>
      {editable && (
        <section className="mt-7 rounded-3xl border border-red-200 bg-red-50 p-6">
          <h2 className="text-lg font-black text-red-900">Xóa từ khỏi thư viện</h2>
          <p className="mt-2 text-sm leading-6 text-red-800">
            Chỉ xóa được từ bản nháp do bạn tạo và chưa được dùng trong bài học.
          </p>
          <form action={deleteVocabularyDraft} className="mt-4">
            <input type="hidden" name="vocabularyId" value={item.id} />
            <ConfirmSubmitButton
              confirmation={`Xóa vĩnh viễn từ “${item.hangul}”? Thao tác này không thể hoàn tác.`}
              className="rounded-xl bg-red-700 px-5 py-3 font-black text-white"
            >
              Xóa từ vựng
            </ConfirmSubmitButton>
          </form>
        </section>
      )}
    </main>
  );
}
