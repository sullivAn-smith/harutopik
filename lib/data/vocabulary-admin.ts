import "server-only";

import { requirePermission } from "@/lib/auth/authorize";
import { createClient } from "@/lib/supabase/server";

export type VocabularyAdminItem = {
  id: string;
  hangul: string;
  romanization: string;
  meaningVi: string;
  partOfSpeech: string | null;
  level: string;
  category: string;
  audioUrl: string | null;
  imageUrl: string | null;
  status: string;
  createdBy: string;
};

export async function getVocabularyLibrary() {
  await requirePermission("content:read-draft");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vocabulary_items")
    .select("id,hangul,romanization,primary_meaning_vi,part_of_speech,level,category,audio_url,image_url,status,created_by")
    .order("updated_at", { ascending: false })
    .limit(500);
  if (error) throw new Error("Không thể tải thư viện từ vựng.");
  return (data ?? []).map((item) => ({
    id: item.id,
    hangul: item.hangul,
    romanization: item.romanization,
    meaningVi: item.primary_meaning_vi,
    partOfSpeech: item.part_of_speech,
    level: item.level,
    category: item.category,
    audioUrl: item.audio_url,
    imageUrl: item.image_url,
    status: item.status,
    createdBy: item.created_by,
  })) satisfies VocabularyAdminItem[];
}

export async function getVocabularyAdminItem(id: string) {
  const actor = await requirePermission("content:read-draft");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vocabulary_items")
    .select("id,hangul,romanization,primary_meaning_vi,part_of_speech,level,category,audio_url,image_url,status,created_by")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  if (
    data.status !== "published" &&
    data.created_by !== actor.id &&
    !actor.roles.includes("admin")
  ) return null;
  const [{ data: answers }, { data: examples }] = await Promise.all([
    supabase
      .from("vocabulary_accepted_answers")
      .select("direction,answer")
      .eq("vocabulary_id", id)
      .order("answer"),
    supabase
      .from("vocabulary_examples")
      .select("korean,vietnamese,position")
      .eq("vocabulary_id", id)
      .order("position"),
  ]);
  return {
    id: data.id,
    hangul: data.hangul,
    romanization: data.romanization,
    meaningVi: data.primary_meaning_vi,
    partOfSpeech: data.part_of_speech,
    level: data.level,
    category: data.category,
    audioUrl: data.audio_url,
    imageUrl: data.image_url,
    status: data.status,
    createdBy: data.created_by,
    acceptedVi: (answers ?? []).filter((item) => item.direction === "ko_vi").map((item) => item.answer),
    acceptedKo: (answers ?? []).filter((item) => item.direction === "vi_ko").map((item) => item.answer),
    examples: examples ?? [],
  };
}
