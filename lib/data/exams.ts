import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ExamSummary } from "@/lib/exams/types";
import { requirePermission } from "@/lib/auth/authorize";
import { canManageExam } from "@/lib/exams/access";

type ExamRow = {
  id: string; code: string; title: string; description: string;
  duration_minutes: number; listening_duration_minutes: number;
  reading_duration_minutes: number; status: string; updated_at: string;
  exam_questions?: { count: number }[];
};

function summary(row: ExamRow): ExamSummary {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    description: row.description,
    durationMinutes: row.duration_minutes,
    listeningDurationMinutes: row.listening_duration_minutes,
    readingDurationMinutes: row.reading_duration_minutes,
    status: row.status,
    questionCount: row.exam_questions?.[0]?.count ?? 0,
    updatedAt: row.updated_at,
  };
}

export async function getEditorExams() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exam_sets")
    .select("id,code,title,description,duration_minutes,listening_duration_minutes,reading_duration_minutes,status,updated_at,exam_questions(count)")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data as ExamRow[]).map(summary);
}

export async function getPublishedExams() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("exam_sets")
    .select("id,code,title,description,duration_minutes,listening_duration_minutes,reading_duration_minutes,status,updated_at,exam_questions(count)")
    .eq("status", "published")
    .order("published_at", { ascending: false });
  if (error) throw error;
  return (data as ExamRow[]).map(summary);
}

export async function getExamForEditing(examId: string) {
  const actor = await requirePermission("content:read-draft");
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("exam_sets")
    .select("id,code,title,description,duration_minutes,listening_duration_minutes,reading_duration_minutes,instructions,status,review_note,version,created_by,exam_questions(id,position,section,audio_block_key,answer_type,instruction,prompt,audio_url,audio_text,image_url,play_limit,options,option_images,correct_option,explanation)")
    .eq("id", examId)
    .order("position", { referencedTable: "exam_questions", ascending: true })
    .maybeSingle();
  if (error) throw error;
  if (data && !canManageExam({ actorId: actor.id, roles: actor.roles, ownerId: data.created_by })) return null;
  return data;
}

export async function getExamAttempt(attemptId: string, userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("exam_attempts")
    .select("id,exam_id,user_id,status,attempt_mode,started_at,expires_at,current_position,current_section,listening_expires_at,reading_expires_at,audio_plays,window_leave_count,answers,flagged,question_snapshot,score,listening_score,reading_score,correct_count,total_questions,exam_sets(title,instructions),exam_highlights(id,selected_text,color,section,question_id,source_field,source_index,prefix_text,suffix_text,review_list_id,review_saved_at)")
    .eq("id", attemptId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getUserExamHistory(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("exam_attempts")
    .select("id,exam_id,status,attempt_mode,started_at,submitted_at,score,correct_count,total_questions,exam_sets(title)")
    .eq("user_id", userId)
    .in("status", ["submitted", "expired"])
    .order("started_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return data ?? [];
}
