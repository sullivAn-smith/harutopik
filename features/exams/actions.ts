"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission, getCurrentActor } from "@/lib/auth/authorize";
import { buildExamAttemptPlan, examAttemptModeSchema } from "@/lib/exams/attempt-mode";
import { canManageExam } from "@/lib/exams/access";
import { examDraftSchema, examLevelSchema, formatExamValidationError } from "@/lib/exams/types";
import { withErrorMessage } from "@/lib/navigation/redirect-url";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function message(error: unknown) {
  const value = error instanceof Error ? error.message : "Không thể hoàn tất thao tác.";
  if (value.includes("EXAM_NOT_READY")) return "Đề phải có cả phần Nghe và Đọc; mọi câu cần đủ 4 đáp án.";
  if (value.includes("PREVIEW_REQUIRED")) return "Hãy xem trước đề như người học sau lần lưu cuối rồi mới gửi duyệt.";
  if (value.includes("duplicate") || value.includes("unique")) return "Mã đề hoặc số thứ tự câu đã tồn tại.";
  return value;
}

function examStoragePath(url: unknown, bucket: "exam-audio" | "exam-images", examId: string) {
  if (typeof url !== "string" || !url) return null;
  const marker = `/storage/v1/object/public/${bucket}/`;
  const markerIndex = url.indexOf(marker);
  if (markerIndex < 0) return null;
  const encodedPath = url.slice(markerIndex + marker.length).split("?")[0];
  try {
    const path = decodeURIComponent(encodedPath);
    return path.startsWith(`${examId}/`) ? path : null;
  } catch {
    return null;
  }
}

export async function deleteExamDraft(formData: FormData) {
  const actor = await requirePermission("content:edit");
  const parsedId = z.string().uuid().safeParse(text(formData, "examId"));
  if (!parsedId.success) redirect(withErrorMessage("/bien-tap/de-thi", "Không xác định được bản nháp cần xóa."));

  const examId = parsedId.data;
  const admin = createAdminClient();
  const { data: exam, error: readError } = await admin.from("exam_sets")
    .select("id,title,status,created_by,exam_questions(audio_url,image_url,option_images)")
    .eq("id", examId)
    .maybeSingle();
  if (readError || !exam) redirect(withErrorMessage("/bien-tap/de-thi", "Bản nháp không còn tồn tại."));
  if (!canManageExam({ actorId: actor.id, roles: actor.roles, ownerId: exam.created_by })) {
    redirect(withErrorMessage("/bien-tap/de-thi", "Bạn không có quyền xóa bản nháp này."));
  }
  if (exam.status !== "draft") {
    redirect(withErrorMessage("/bien-tap/de-thi", "Chỉ được xóa bản nháp. Đề đã gửi duyệt hoặc đang phát hành phải do admin xử lý."));
  }

  const audioPaths = new Set<string>();
  const imagePaths = new Set<string>();
  for (const question of exam.exam_questions ?? []) {
    const audioPath = examStoragePath(question.audio_url, "exam-audio", examId);
    const imagePath = examStoragePath(question.image_url, "exam-images", examId);
    if (audioPath) audioPaths.add(audioPath);
    if (imagePath) imagePaths.add(imagePath);
    if (Array.isArray(question.option_images)) {
      for (const optionImage of question.option_images) {
        const optionPath = examStoragePath(optionImage, "exam-images", examId);
        if (optionPath) imagePaths.add(optionPath);
      }
    }
  }

  const { error: deleteError } = await admin.from("exam_sets").delete().eq("id", examId).eq("status", "draft");
  if (deleteError) redirect(withErrorMessage("/bien-tap/de-thi", message(deleteError)));

  await Promise.all([
    audioPaths.size ? admin.storage.from("exam-audio").remove([...audioPaths]) : Promise.resolve(),
    imagePaths.size ? admin.storage.from("exam-images").remove([...imagePaths]) : Promise.resolve(),
  ]);
  revalidatePath("/bien-tap/de-thi");
  revalidatePath(`/bien-tap/de-thi/${examId}`);
  redirect("/bien-tap/de-thi?deleted=1");
}

export async function createExamDraft(formData: FormData) {
  const actor = await requirePermission("content:create");
  const parsed = z.object({
    code: z.string().regex(/^[a-z0-9][a-z0-9-]{2,79}$/),
    title: z.string().min(3).max(160),
    level: examLevelSchema,
    listeningDurationMinutes: z.coerce.number().int().min(1).max(180),
    readingDurationMinutes: z.coerce.number().int().min(1).max(180),
  }).safeParse({
    code: text(formData, "code"), title: text(formData, "title"),
    level: text(formData, "level"),
    listeningDurationMinutes: formData.get("listeningDurationMinutes"),
    readingDurationMinutes: formData.get("readingDurationMinutes"),
  });
  if (!parsed.success) redirect(withErrorMessage("/bien-tap/de-thi/moi", "Thông tin đề chưa hợp lệ."));
  const supabase = await createClient();
  const { data, error } = await supabase.from("exam_sets").insert({
    code: parsed.data.code, title: parsed.data.title,
    level: parsed.data.level,
    answer_review_policy: "immediate",
    answer_review_available_at: null,
    duration_minutes: parsed.data.listeningDurationMinutes + parsed.data.readingDurationMinutes,
    listening_duration_minutes: parsed.data.listeningDurationMinutes,
    reading_duration_minutes: parsed.data.readingDurationMinutes,
    created_by: actor.id,
    instructions: "Chọn luyện riêng phần Nghe, riêng phần Đọc hoặc mô phỏng đầy đủ. Ở chế độ mô phỏng, bạn có thể chuyển tự do giữa hai phần.",
  }).select("id").single();
  if (error) redirect(withErrorMessage("/bien-tap/de-thi/moi", message(error)));
  redirect(`/bien-tap/de-thi/${data.id}?created=1`);
}

export async function saveExamDraft(examId: string, _state: { message: string; ok: boolean }, formData: FormData) {
  const actor = await requirePermission("content:edit");
  const questionsRaw = text(formData, "questions");
  const input = {
    code: text(formData, "code"), title: text(formData, "title"),
    level: text(formData, "level"),
    answerReviewPolicy: "immediate",
    answerReviewAvailableAt: "",
    description: text(formData, "description"),
    listeningDurationMinutes: Number(formData.get("listeningDurationMinutes")),
    readingDurationMinutes: Number(formData.get("readingDurationMinutes")),
    instructions: text(formData, "instructions"),
    questions: JSON.parse(questionsRaw || "[]"),
  };
  const parsed = examDraftSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: formatExamValidationError(parsed.error, input) };
  void actor;
  const supabase = await createClient();
  const { error: saveError } = await supabase.rpc("save_exam_draft", {
    p_exam_id: examId,
    p_exam: {
      code: parsed.data.code, title: parsed.data.title,
      level: parsed.data.level,
      answerReviewPolicy: "immediate",
      answerReviewAvailableAt: "",
      description: parsed.data.description,
      listeningDurationMinutes: parsed.data.listeningDurationMinutes,
      readingDurationMinutes: parsed.data.readingDurationMinutes,
      instructions: parsed.data.instructions,
    },
    p_questions: parsed.data.questions,
  });
  if (saveError) return { ok: false, message: message(saveError) };
  const { error: historyError } = await supabase.rpc("record_exam_revision", { p_exam_id: examId });
  if (historyError && historyError.code !== "PGRST202" && historyError.code !== "42883") return { ok: false, message: `Đã lưu đề nhưng chưa ghi được lịch sử: ${message(historyError)}` };
  revalidatePath(`/bien-tap/de-thi/${examId}`);
  revalidatePath(`/bien-tap/de-thi/${examId}/xem-truoc`);
  revalidatePath("/luyen-de");
  revalidatePath(`/luyen-de/${examId}`);
  revalidatePath(`/luyen-de/${examId}/lam-bai`);
  return {
    ok: true,
    message: `Đã lưu ${parsed.data.questions.length} câu ${parsed.data.level === "topik_ii" ? "TOPIK II" : "TOPIK I"}.`,
  };
}

export async function markExamPreviewed(formData: FormData) {
  await requirePermission("content:read-draft");
  const examId = text(formData, "examId");
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_exam_previewed", { p_exam_id: examId });
  if (error && error.code !== "PGRST202" && error.code !== "42883") redirect(withErrorMessage(`/bien-tap/de-thi/${examId}/xem-truoc`, message(error)));
  revalidatePath(`/bien-tap/de-thi/${examId}`);
  redirect(`/bien-tap/de-thi/${examId}`);
}

export async function submitExamForReview(formData: FormData) {
  await requirePermission("content:submit-review");
  const examId = text(formData, "examId");
  const allowIncomplete = text(formData, "allowIncomplete") === "1";
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_exam_for_review", { p_exam_id: examId });
  if (error && allowIncomplete && (error.message.includes("EXAM_NOT_READY") || error.message.includes("PREVIEW_REQUIRED"))) {
    const { error: testSubmitError } = await supabase.from("exam_sets").update({ status: "pending_review", updated_at: new Date().toISOString() }).eq("id", examId).in("status", ["draft", "changes_requested"]);
    if (testSubmitError) redirect(withErrorMessage(`/bien-tap/de-thi/${examId}`, message(testSubmitError)));
  } else if (error) redirect(withErrorMessage(`/bien-tap/de-thi/${examId}`, message(error)));
  revalidatePath("/bien-tap/de-thi");
  redirect("/bien-tap/de-thi?submitted=1");
}

export async function reviewExam(formData: FormData) {
  await requirePermission("content:approve");
  const examId = text(formData, "examId");
  const decision = text(formData, "decision");
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_exam", { p_exam_id: examId, p_decision: decision, p_note: text(formData, "note") || null });
  if (error) redirect(withErrorMessage(`/quan-tri/de-thi/${examId}`, message(error)));
  revalidatePath("/quan-tri/de-thi");
  redirect("/quan-tri/de-thi?reviewed=1");
}

export async function publishExam(formData: FormData) {
  await requirePermission("content:publish");
  const examId = text(formData, "examId");
  const supabase = await createClient();
  const { error } = await supabase.rpc("publish_exam", { p_exam_id: examId });
  if (error) redirect(withErrorMessage(`/quan-tri/de-thi/${examId}`, message(error)));
  revalidatePath("/luyen-de");
  revalidatePath(`/luyen-de/${examId}`);
  redirect("/quan-tri/de-thi?published=1");
}

export async function changeExamRelease(formData: FormData) {
  await requirePermission("content:publish");
  const examId = text(formData, "examId");
  const action = text(formData, "releaseAction");
  const supabase = await createClient();
  const { error } = await supabase.rpc("change_exam_release", { p_exam_id: examId, p_action: action });
  if (error) redirect(withErrorMessage(`/quan-tri/de-thi/${examId}`, message(error)));
  revalidatePath("/luyen-de");
  revalidatePath(`/luyen-de/${examId}`);
  redirect("/quan-tri/de-thi?reviewed=1");
}

export async function startExam(formData: FormData) {
  const actor = await getCurrentActor();
  const examId = text(formData, "examId");
  if (!actor) redirect(`/dang-nhap?next=${encodeURIComponent(`/luyen-de/${examId}`)}`);
  const parsedMode = examAttemptModeSchema.safeParse(text(formData, "attemptMode"));
  if (!parsedMode.success) redirect(withErrorMessage(`/luyen-de/${examId}`, "Hãy chọn một chế độ thi hợp lệ."));
  const admin = createAdminClient();
  const { data: exam } = await admin.from("exam_sets").select("id,status,version,listening_duration_minutes,reading_duration_minutes,exam_questions(id,position,section,audio_block_key,reading_type,passage_block_key,passage,answer_type,instruction,prompt,audio_url,audio_text,image_url,play_limit,options,option_images,correct_option,explanation)").eq("id", examId).eq("status", "published").maybeSingle();
  if (!exam || !exam.exam_questions?.length) redirect(withErrorMessage("/luyen-de", "Đề thi chưa sẵn sàng."));
  if (!exam.exam_questions.some((question) => question.section === "listening") || !exam.exam_questions.some((question) => question.section === "reading")) redirect(withErrorMessage("/luyen-de", "Đề thi chưa có đủ phần Nghe và Đọc."));
  const { data: activeAttempt } = await admin.from("exam_attempts")
    .select("id,expires_at,exam_version")
    .eq("exam_id", examId)
    .eq("user_id", actor.id)
    .eq("attempt_mode", parsedMode.data)
    .eq("status", "in_progress")
    .gt("expires_at", new Date().toISOString())
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (activeAttempt && activeAttempt.exam_version === exam.version) redirect(`/luyen-de/${examId}/lam-bai?attempt=${activeAttempt.id}`);
  if (activeAttempt) {
    const staleAttemptId = activeAttempt.id;
    await admin.from("exam_attempts").update({ status: "expired", expires_at: new Date().toISOString() }).eq("id", staleAttemptId).eq("user_id", actor.id);
  }
  const plan = buildExamAttemptPlan({
    mode: parsedMode.data,
    listeningDurationMinutes: exam.listening_duration_minutes,
    readingDurationMinutes: exam.reading_duration_minutes,
    questions: exam.exam_questions,
  });
  if (!plan.questions.length) redirect(withErrorMessage(`/luyen-de/${examId}`, "Đề chưa có câu hỏi cho chế độ bạn chọn."));
  const now = Date.now();
  const expiresAt = new Date(now + plan.durationMinutes * 60_000).toISOString();
  const { data, error } = await admin.from("exam_attempts").insert({
    exam_id: examId, user_id: actor.id,
    attempt_mode: parsedMode.data,
    expires_at: expiresAt,
    listening_expires_at: parsedMode.data === "reading" ? null : expiresAt,
    reading_expires_at: parsedMode.data === "listening" ? null : expiresAt,
    exam_version: exam.version,
    current_section: plan.initialSection,
    total_questions: plan.questions.length,
    question_snapshot: plan.questions,
  }).select("id").single();
  if (error) redirect(withErrorMessage("/luyen-de", "Chưa thể bắt đầu đề thi."));
  redirect(`/luyen-de/${examId}/lam-bai?attempt=${data.id}`);
}
