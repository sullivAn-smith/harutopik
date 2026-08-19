"use server";

import { revalidatePath, updateTag } from "next/cache";
import { requirePermission } from "@/lib/auth/authorize";
import { publishedExamsCacheTag } from "@/lib/data/exams";
import { examDraftSchema, formatExamValidationError, getExamEligibility } from "@/lib/exams/types";
import { createClient } from "@/lib/supabase/server";

export async function hotfixPublishedExam(examId: string, _state: { ok: boolean; message: string }, formData: FormData) {
  await requirePermission("content:publish");
  const questions = JSON.parse(String(formData.get("questions") ?? "[]"));
  const input = {
    code: String(formData.get("code") ?? ""), title: String(formData.get("title") ?? ""),
    level: String(formData.get("level") ?? "topik_i"),
    answerReviewPolicy: "immediate",
    answerReviewAvailableAt: "",
    description: String(formData.get("description") ?? ""),
    listeningDurationMinutes: Number(formData.get("listeningDurationMinutes")),
    readingDurationMinutes: Number(formData.get("readingDurationMinutes")),
    instructions: String(formData.get("instructions") ?? ""), questions,
  };
  const parsed = examDraftSchema.safeParse(input);
  const reason = String(formData.get("hotfixReason") ?? "").trim();
  if (!parsed.success) return { ok: false, message: formatExamValidationError(parsed.error, input) };
  const eligibility = getExamEligibility(parsed.data.questions);
  if (!eligibility.eligible || parsed.data.questions.some((question) => question.options.some((option) => !option))) return { ok: false, message: eligibility.issues[0] ?? "Mỗi câu phải có đủ bốn đáp án." };
  if (!reason) return { ok: false, message: "Hãy nhập lý do hotfix." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("hotfix_published_exam", {
    p_exam_id: examId,
    p_exam: { code: parsed.data.code, title: parsed.data.title, level: parsed.data.level, answerReviewPolicy: "immediate", answerReviewAvailableAt: "", description: parsed.data.description, listeningDurationMinutes: parsed.data.listeningDurationMinutes, readingDurationMinutes: parsed.data.readingDurationMinutes, instructions: parsed.data.instructions },
    p_questions: parsed.data.questions, p_reason: reason,
  });
  if (error) return { ok: false, message: error.message };
  updateTag(publishedExamsCacheTag);
  revalidatePath("/luyen-de");
  revalidatePath(`/luyen-de/${examId}`);
  revalidatePath(`/luyen-de/${examId}/lam-bai`);
  revalidatePath(`/bien-tap/de-thi/${examId}/xem-truoc`);
  revalidatePath(`/quan-tri/de-thi/${examId}`);
  return { ok: true, message: `Đã áp dụng phiên bản ${data}. Lượt thi mở lại sẽ tự dùng nội dung mới.` };
}
