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
  if (value.includes("EXAM_NOT_READY")) return "Đề phải có cả phần Nghe và Đọc; mỗi câu nghe cần audio và mọi câu cần đủ 4 đáp án.";
  if (value.includes("duplicate") || value.includes("unique")) return "Mã đề hoặc số thứ tự câu đã tồn tại.";
  return value;
}

export async function createExamDraft(formData: FormData) {
  const actor = await requirePermission("content:create");
  const parsed = z.object({
    code: z.string().regex(/^[a-z0-9][a-z0-9-]{2,79}$/),
    title: z.string().min(3).max(160),
    listeningDurationMinutes: z.coerce.number().int().min(1).max(180),
    readingDurationMinutes: z.coerce.number().int().min(1).max(180),
  }).safeParse({
    code: text(formData, "code"), title: text(formData, "title"),
    listeningDurationMinutes: formData.get("listeningDurationMinutes"),
    readingDurationMinutes: formData.get("readingDurationMinutes"),
  });
  if (!parsed.success) redirect("/bien-tap/de-thi/moi?error=Thông tin đề chưa hợp lệ.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("exam_sets").insert({
    code: parsed.data.code, title: parsed.data.title,
    duration_minutes: parsed.data.listeningDurationMinutes + parsed.data.readingDurationMinutes,
    listening_duration_minutes: parsed.data.listeningDurationMinutes,
    reading_duration_minutes: parsed.data.readingDurationMinutes,
    created_by: actor.id,
    instructions: "Hoàn thành phần Nghe trước, sau đó chuyển sang phần Đọc. Không thể quay lại phần đã hoàn thành.",
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
    listeningDurationMinutes: Number(formData.get("listeningDurationMinutes")),
    readingDurationMinutes: Number(formData.get("readingDurationMinutes")),
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
      description: parsed.data.description,
      listeningDurationMinutes: parsed.data.listeningDurationMinutes,
      readingDurationMinutes: parsed.data.readingDurationMinutes,
      instructions: parsed.data.instructions,
    },
    p_questions: parsed.data.questions,
  });
  if (saveError) return { ok: false, message: message(saveError) };
  revalidatePath(`/bien-tap/de-thi/${examId}`);
  return { ok: true, message: `Đã lưu ${parsed.data.questions.length} câu TOPIK I.` };
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
  const { data: exam } = await admin.from("exam_sets").select("id,status,version,listening_duration_minutes,reading_duration_minutes,exam_questions(id,position,section,instruction,prompt,audio_url,image_url,play_limit,options,correct_option,explanation)").eq("id", examId).eq("status", "published").maybeSingle();
  if (!exam || !exam.exam_questions?.length) redirect("/luyen-de?error=Đề thi chưa sẵn sàng.");
  if (!exam.exam_questions.some((question) => question.section === "listening") || !exam.exam_questions.some((question) => question.section === "reading")) redirect("/luyen-de?error=Đề TOPIK I chưa có đủ phần Nghe và Đọc.");
  const now = Date.now();
  const { data, error } = await admin.from("exam_attempts").insert({
    exam_id: examId, user_id: actor.id,
    expires_at: new Date(now + (exam.listening_duration_minutes + exam.reading_duration_minutes) * 60_000).toISOString(),
    listening_expires_at: new Date(now + exam.listening_duration_minutes * 60_000).toISOString(),
    exam_version: exam.version,
    current_section: "listening",
    total_questions: exam.exam_questions.length,
    question_snapshot: exam.exam_questions,
  }).select("id").single();
  if (error) redirect("/luyen-de?error=Chưa thể bắt đầu đề thi.");
  redirect(`/luyen-de/${examId}/lam-bai?attempt=${data.id}`);
}
