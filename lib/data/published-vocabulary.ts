import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { VocabularyItem } from "@/content/schema";
import {
  getSupabaseConfig,
  isSupabaseConfigured,
} from "@/lib/supabase/config";
import {
  toRuntimeVocabulary,
  vocabularyMasterSchema,
} from "@/lib/vocabulary/domain";

type LessonVocabularyRow = {
  lesson_id: string;
  vocabulary_id: string;
  position: number;
};

export async function getPublishedVocabularyByLesson(
  lessonIds: readonly string[],
): Promise<Map<string, VocabularyItem[]>> {
  const result = new Map<string, VocabularyItem[]>();
  if (lessonIds.length === 0) return result;
  if (!isSupabaseConfigured()) return result;

  const { supabaseUrl, supabasePublishableKey } = getSupabaseConfig();
  const supabase = createClient(supabaseUrl, supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: relations, error: relationError } = await supabase
    .from("lesson_vocabulary")
    .select("lesson_id,vocabulary_id,position")
    .in("lesson_id", [...lessonIds])
    .order("position");
  if (relationError || !relations?.length) return result;

  const relationRows = relations as LessonVocabularyRow[];
  const vocabularyIds = [
    ...new Set(relationRows.map((relation) => relation.vocabulary_id)),
  ];
  const [
    { data: items, error: itemError },
    { data: examples },
    { data: acceptedAnswers },
  ] =
    await Promise.all([
      supabase
        .from("vocabulary_items")
        .select(
          "id,hangul,normalized_hangul,romanization,primary_meaning_vi,part_of_speech,level,category,audio_url,image_url,status",
        )
        .in("id", vocabularyIds)
        .eq("status", "published"),
      supabase
        .from("vocabulary_examples")
        .select("id,vocabulary_id,korean,vietnamese,audio_url,position")
        .in("vocabulary_id", vocabularyIds)
        .order("position"),
      supabase
        .from("vocabulary_accepted_answers")
        .select("vocabulary_id,direction,answer")
        .in("vocabulary_id", vocabularyIds),
    ]);
  if (itemError || !items) return result;

  const masters = new Map(
    items.flatMap((item) => {
      const parsed = vocabularyMasterSchema.safeParse({
        id: item.id,
        hangul: item.hangul,
        normalizedHangul: item.normalized_hangul,
        romanization: item.romanization,
        primaryMeaningVi: item.primary_meaning_vi,
        partOfSpeech: item.part_of_speech,
        level: item.level,
        category: item.category,
        audioUrl: item.audio_url,
        imageUrl: item.image_url,
        status: item.status,
      });
      return parsed.success ? [[parsed.data.id, parsed.data] as const] : [];
    }),
  );
  const examplesByVocabulary = new Map<
    string,
    VocabularyItem["examples"]
  >();
  const acceptedVietnameseByVocabulary = new Map<string, string[]>();
  const acceptedKoreanByVocabulary = new Map<string, string[]>();
  for (const example of examples ?? []) {
    examplesByVocabulary.set(example.vocabulary_id, [
      ...(examplesByVocabulary.get(example.vocabulary_id) ?? []),
      {
        id: example.id,
        korean: example.korean,
        vietnamese: example.vietnamese,
        ...(example.audio_url ? { audioUrl: example.audio_url } : {}),
      },
    ]);
  }
  for (const answer of acceptedAnswers ?? []) {
    const target =
      answer.direction === "ko_vi"
        ? acceptedVietnameseByVocabulary
        : acceptedKoreanByVocabulary;
    target.set(answer.vocabulary_id, [
      ...(target.get(answer.vocabulary_id) ?? []),
      answer.answer,
    ]);
  }

  for (const relation of relationRows) {
    const master = masters.get(relation.vocabulary_id);
    if (!master) continue;
    result.set(relation.lesson_id, [
      ...(result.get(relation.lesson_id) ?? []),
      toRuntimeVocabulary({
        master,
        examples: examplesByVocabulary.get(master.id) ?? [],
        acceptedVietnameseAnswers:
          acceptedVietnameseByVocabulary.get(master.id) ?? [],
        acceptedKoreanAnswers:
          acceptedKoreanByVocabulary.get(master.id) ?? [],
      }),
    ]);
  }
  return result;
}
