import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ExamAnswerReviewPolicy, ExamLevel, ExamSummary } from "@/lib/exams/types";
import { requirePermission } from "@/lib/auth/authorize";
import { canManageExam } from "@/lib/exams/access";

type ExamRow = {
  id: string;
  code: string;
  title: string;
  description: string;
  level: ExamLevel;
  duration_minutes: number;
  listening_duration_minutes: number;
  reading_duration_minutes: number;
  answer_review_policy: ExamAnswerReviewPolicy;
  answer_review_available_at: string | null;
  status: string;
  updated_at: string;
  exam_questions?: Array<{ section: "listening" | "reading"; position: number }>;
};

function summary(row: ExamRow): ExamSummary {
  const questions = row.exam_questions ?? [];
  const listeningQuestionCount = questions.filter((question) => question.section === "listening").length;
  const readingQuestionCount = questions.filter((question) => question.section === "reading").length;
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    level: row.level ?? "topik_i",
    description: row.description,
    durationMinutes: row.duration_minutes,
    listeningDurationMinutes: row.listening_duration_minutes,
    readingDurationMinutes: row.reading_duration_minutes,
    status: row.status,
    questionCount: questions.length,
    listeningQuestionCount,
    readingQuestionCount,
    answerReviewPolicy: row.answer_review_policy ?? "immediate",
    answerReviewAvailableAt: row.answer_review_available_at,
    updatedAt: row.updated_at,
  };
}

const examSummarySelect = "id,code,title,description,level,duration_minutes,listening_duration_minutes,reading_duration_minutes,answer_review_policy,answer_review_available_at,status,updated_at,exam_questions(section,position)";

export async function getEditorExams() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("exam_sets").select(examSummarySelect).order("updated_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as ExamRow[]).map(summary);
}

export async function getPublishedExams() {
  const admin = createAdminClient();
  const { data, error } = await admin.from("exam_sets").select(examSummarySelect).eq("status", "published").order("published_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as ExamRow[]).map(summary);
}

export async function getExamForEditing(examId: string) {
  const actor = await requirePermission("content:read-draft");
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("exam_sets")
    .select("id,code,title,description,level,duration_minutes,listening_duration_minutes,reading_duration_minutes,instructions,answer_review_policy,answer_review_available_at,status,review_note,version,created_by,updated_at,exam_questions(id,position,section,audio_block_key,reading_type,passage_block_key,passage,answer_type,instruction,prompt,audio_url,audio_text,image_url,play_limit,options,option_images,correct_option,explanation)")
    .eq("id", examId)
    .order("position", { referencedTable: "exam_questions", ascending: true })
    .maybeSingle();
  if (error) throw error;
  if (data && !canManageExam({ actorId: actor.id, roles: actor.roles, ownerId: data.created_by })) return null;
  if (!data) return null;
  const preview = await admin.from("exam_sets").select("previewed_at").eq("id", examId).maybeSingle();
  return { ...data, previewed_at: preview.error ? undefined : preview.data?.previewed_at ?? null };
}

export async function getExamRevisionHistory(examId: string) {
  await requirePermission("content:read-draft");
  const admin = createAdminClient();
  const { data, error } = await admin.from("exam_revisions")
    .select("id,version,status,created_at,created_by")
    .eq("exam_id", examId).order("version", { ascending: false }).limit(30);
  if (error?.code === "42P01" || error?.code === "PGRST205") return [];
  if (error) throw error;
  return data ?? [];
}

export async function getExamAttempt(attemptId: string, userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("exam_attempts")
    .select("id,exam_id,user_id,status,attempt_mode,started_at,submitted_at,expires_at,current_position,current_section,listening_expires_at,reading_expires_at,audio_plays,window_leave_count,answers,flagged,question_snapshot,score,listening_score,reading_score,correct_count,total_questions,exam_sets(code,title,instructions,answer_review_policy,answer_review_available_at),exam_highlights(id,selected_text,color,section,question_id,source_field,source_index,prefix_text,suffix_text,review_list_id,review_saved_at)")
    .eq("id", attemptId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type ExamHistorySummary = {
  exam_id: string;
  code: string;
  title: string;
  level: ExamLevel;
  attempt_count: number;
  best_score: number;
  best_max_score: number;
  last_attempt_at: string;
  last_attempt_id: string;
};

export async function getUserExamHistorySummary(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_exam_history_summary", { p_user_id: userId });
  if (error) throw error;
  return (data ?? []) as ExamHistorySummary[];
}

export async function getUserExamAttemptsForExam(userId: string, examId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("exam_attempts")
    .select("id,exam_id,status,attempt_mode,started_at,submitted_at,score,listening_score,reading_score,correct_count,total_questions,exam_sets(code,title,level)")
    .eq("user_id", userId)
    .eq("exam_id", examId)
    .in("status", ["submitted", "expired"])
    .order("started_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
