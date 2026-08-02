"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission, getCurrentActor } from "@/lib/auth/authorize";
import { examDraftSchema } from "@/lib/exams/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function message(error: unknown) {
  const value = error instanceof Error ? error.message : "Không thể hoàn tất thao tác.";
  if (value.includes("EXAM_NOT_READY")) return "Mỗi câu nghe phải có audio và đủ 4 đáp án trước khi gửi duyệt.";
  if (value.includes("duplicate") || value.includes("unique")) return "Mã đề hoặc số thứ tự câu đã tồn tại.";
  return value;
}

export async function createExamDraft(formData: FormData) {
  const actor = await requirePermission("content:create");
  const parsed = z.object({
    code: z.string().regex(/^[a-z0-9][a-z0-9-]{2,79}$/),
    title: z.string().min(3).max(160),
    durationMinutes: z.coerce.number().int().min(1).max(180),
  }).safeParse({
    code: text(formData, "code"), title: text(formData, "title"),
    durationMinutes: formData.get("durationMinutes"),
  });
  if (!parsed.success) redirect("/bien-tap/de-thi/moi?error=Thông tin đề chưa hợp lệ.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("exam_sets").insert({
    code: parsed.data.code, title: parsed.data.title,
    duration_minutes: parsed.data.durationMinutes, created_by: actor.id,
    instructions: "Mỗi câu có một audio riêng. Chọn một đáp án đúng. Hết giờ hệ thống sẽ tự nộp bài.",
  }).select("id").single();
  if (error) redirect(`/bien-tap/de-thi/moi?error=${encodeURIComponent(message(error))}`);
  redirect(`/bien-tap/de-thi/${data.id}?created=1`);
}

export async function saveExamDraft(examId: string, _state: { message: string; ok: boolean }, formData: FormData) {
  const actor = await requirePermission("content:edit");
  const questionsRaw = text(formData, "questions");
  const parsed = examDraftSchema.safeParse({
    code: text(formData, "code"), title: text(formData, "title"),
    description: text(formData, "description"),
    durationMinutes: Number(formData.get("durationMinutes")),
    instructions: text(formData, "instructions"),
    questions: JSON.parse(questionsRaw || "[]"),
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Dữ liệu đề chưa hợp lệ." };
  void actor;
  const supabase = await createClient();
  const { error: saveError } = await supabase.rpc("save_exam_draft", {
    p_exam_id: examId,
    p_exam: {
      code: parsed.data.code, title: parsed.data.title,
      description: parsed.data.description, durationMinutes: parsed.data.durationMinutes,
      instructions: parsed.data.instructions,
    },
    p_questions: parsed.data.questions,
  });
  if (saveError) return { ok: false, message: message(saveError) };
  revalidatePath(`/bien-tap/de-thi/${examId}`);
  return { ok: true, message: `Đã lưu ${parsed.data.questions.length} câu nghe.` };
}

export async function submitExamForReview(formData: FormData) {
  await requirePermission("content:submit-review");
  const examId = text(formData, "examId");
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_exam_for_review", { p_exam_id: examId });
  if (error) redirect(`/bien-tap/de-thi/${examId}?error=${encodeURIComponent(message(error))}`);
  revalidatePath("/bien-tap/de-thi");
  redirect("/bien-tap/de-thi?submitted=1");
}

export async function reviewExam(formData: FormData) {
  await requirePermission("content:approve");
  const examId = text(formData, "examId");
  const decision = text(formData, "decision");
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_exam", { p_exam_id: examId, p_decision: decision, p_note: text(formData, "note") || null });
  if (error) redirect(`/quan-tri/de-thi/${examId}?error=${encodeURIComponent(message(error))}`);
  revalidatePath("/quan-tri/de-thi");
  redirect("/quan-tri/de-thi?reviewed=1");
}

export async function publishExam(formData: FormData) {
  await requirePermission("content:publish");
  const examId = text(formData, "examId");
  const supabase = await createClient();
  const { error } = await supabase.rpc("publish_exam", { p_exam_id: examId });
  if (error) redirect(`/quan-tri/de-thi/${examId}?error=${encodeURIComponent(message(error))}`);
  revalidatePath("/luyen-de");
  redirect("/quan-tri/de-thi?published=1");
}

export async function changeExamRelease(formData: FormData) {
  await requirePermission("content:publish");
  const examId = text(formData, "examId");
  const action = text(formData, "releaseAction");
  const supabase = await createClient();
  const { error } = await supabase.rpc("change_exam_release", { p_exam_id: examId, p_action: action });
  if (error) redirect(`/quan-tri/de-thi/${examId}?error=${encodeURIComponent(message(error))}`);
  revalidatePath("/luyen-de");
  redirect("/quan-tri/de-thi?reviewed=1");
}

export async function startExam(formData: FormData) {
  const actor = await getCurrentActor();
  if (!actor) redirect(`/dang-nhap?next=/luyen-de`);
  const examId = text(formData, "examId");
  const admin = createAdminClient();
  const { data: exam } = await admin.from("exam_sets").select("id,status,duration_minutes,exam_questions(id,position,instruction,prompt,audio_url,image_url,play_limit,options,correct_option,explanation)").eq("id", examId).eq("status", "published").maybeSingle();
  if (!exam || !exam.exam_questions?.length) redirect("/luyen-de?error=Đề thi chưa sẵn sàng.");
  const now = Date.now();
  const { data, error } = await admin.from("exam_attempts").insert({
    exam_id: examId, user_id: actor.id,
    expires_at: new Date(now + exam.duration_minutes * 60_000).toISOString(),
    total_questions: exam.exam_questions.length,
    question_snapshot: exam.exam_questions,
  }).select("id").single();
  if (error) redirect("/luyen-de?error=Chưa thể bắt đầu đề thi.");
  redirect(`/luyen-de/${examId}/lam-bai?attempt=${data.id}`);
}
