"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { lessonSchema } from "@/content/schema";
import { requirePermission } from "@/lib/auth/authorize";
import { createAdminClient } from "@/lib/supabase/admin";

const hotfixSchema = z.object({
  contentId: z.string().min(1).max(200),
  titleVi: z.string().trim().min(2).max(160),
  titleKo: z.string().trim().min(1).max(160),
  summary: z.string().trim().min(10).max(1_000),
  reason: z.string().trim().min(5, "Hãy ghi lý do hotfix.").max(500),
  dictationsJson: z.string(),
  grammarJson: z.string(),
  grammarExercisesJson: z.string(),
});

const dictationsSchema = z.array(
  z.object({
    id: z.string().min(1),
    sentence: z.string().trim().min(1).max(500),
    audioUrl: z.string().url().optional(),
    acceptedAnswers: z.array(z.string().trim().min(1).max(500)).default([]),
    points: z.number().positive().default(1),
  }),
);

const grammarSchema = z.array(
  z.object({
    id: z.string().min(1),
    title: z.string().trim().min(1).max(160),
    form: z.string().trim().min(1).max(300),
    formula: z.string().trim().min(1).max(500),
    explanation: z.string().trim().min(1).max(2_000),
    examples: z.array(
      z.object({
        id: z.string().min(1),
        korean: z.string().trim().min(1).max(500),
        vietnamese: z.string().trim().min(1).max(500),
        audioUrl: z.string().url().optional(),
      }),
    ).min(1, "Mỗi điểm ngữ pháp cần ít nhất một câu ví dụ."),
  }),
);

const grammarExercisesSchema = z.array(
  z.object({
    id: z.string().min(1),
    prompt: z.string().trim().min(1).max(500),
    translation: z.string().trim().min(1).max(500),
    acceptedAnswers: z.array(z.string().trim().min(1).max(300)).min(1),
    points: z.number().positive().default(1),
  }),
).max(15, "Mỗi bài chỉ được có tối đa 15 câu luyện tập ngữ pháp.");

export type HotfixState = {
  status: "idle" | "error";
  message?: string;
  fields?: Record<string, string[]>;
};

export async function applyPublishedLessonHotfix(
  _state: HotfixState,
  formData: FormData,
): Promise<HotfixState> {
  const actor = await requirePermission("content:publish");
  const parsed = hotfixSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Hãy kiểm tra lại nội dung hotfix.",
      fields: parsed.error.flatten().fieldErrors,
    };
  }

  let dictations;
  let grammar;
  let grammarExercises;
  try {
    dictations = dictationsSchema.parse(
      JSON.parse(parsed.data.dictationsJson || "[]"),
    );
    grammar = grammarSchema.parse(JSON.parse(parsed.data.grammarJson || "[]"));
    grammarExercises = grammarExercisesSchema.parse(
      JSON.parse(parsed.data.grammarExercisesJson || "[]"),
    );
  } catch {
    return {
      status: "error",
      message: "Nội dung chính tả hoặc ngữ pháp chưa hợp lệ. Hãy kiểm tra các trường còn trống, đáp án và URL audio.",
      fields: {
        dictationsJson: ["Hãy kiểm tra lại từng câu chính tả."],
        grammarJson: ["Mỗi điểm ngữ pháp cần đủ cấu trúc, giải thích và ít nhất một ví dụ."],
        grammarExercisesJson: ["Mỗi câu luyện tập cần đủ đề bài, gợi ý và đáp án."],
      },
    };
  }

  const admin = createAdminClient();
  const { data: published, error: readError } = await admin
    .from("published_catalog")
    .select("content_id,version,payload")
    .eq("content_id", parsed.data.contentId)
    .eq("content_type", "lesson")
    .maybeSingle();
  const current = lessonSchema.safeParse(published?.payload);
  if (readError || !published || !current.success) {
    return { status: "error", message: "Không tìm thấy bài đang phát hành." };
  }

  const vocabularyIds = current.data.vocabulary.map((item) => item.id);
  const [{ data: masterVocabulary }, { data: masterExamples }] =
    vocabularyIds.length
      ? await Promise.all([
          admin
            .from("vocabulary_items")
            .select("id,audio_url,image_url")
            .in("id", vocabularyIds),
          admin
            .from("vocabulary_examples")
            .select("id,vocabulary_id,audio_url")
            .in("vocabulary_id", vocabularyIds),
        ])
      : [{ data: [] }, { data: [] }];
  const assets = new Map(
    (masterVocabulary ?? []).map((item) => [item.id, item] as const),
  );
  const exampleAudio = new Map(
    (masterExamples ?? []).map((example) => [
      example.id,
      example.audio_url as string | null,
    ]),
  );
  const nonDictationExercises = current.data.exercises.filter(
    (exercise) => exercise.type !== "dictation" && exercise.type !== "fill-blank",
  );
  const nextLesson = lessonSchema.safeParse({
    ...current.data,
    title: { vi: parsed.data.titleVi, ko: parsed.data.titleKo },
    summary: parsed.data.summary,
    grammar,
    vocabulary: current.data.vocabulary.map((item) => {
      const master = assets.get(item.id);
      const content = { ...item };
      delete content.audioUrl;
      delete content.imageUrl;
      return {
        ...content,
        ...(master?.audio_url ? { audioUrl: master.audio_url } : {}),
        ...(master?.image_url ? { imageUrl: master.image_url } : {}),
        examples: item.examples.map((example) => {
          const contentExample = { ...example };
          delete contentExample.audioUrl;
          const audioUrl = exampleAudio.get(example.id);
          return {
            ...contentExample,
            ...(audioUrl ? { audioUrl } : {}),
          };
        }),
      };
    }),
    exercises: [
      ...nonDictationExercises,
      ...dictations.map((item) => ({ ...item, type: "dictation" as const })),
      ...grammarExercises.map((item) => ({
        ...item,
        type: "fill-blank" as const,
      })),
    ],
  });
  if (!nextLesson.success) {
    return {
      status: "error",
      message: "Hotfix chưa vượt qua kiểm tra cấu trúc bài học.",
    };
  }

  const now = new Date().toISOString();
  const [{ error: catalogError }, { error: revisionError }] = await Promise.all([
    admin
      .from("published_catalog")
      .update({ payload: nextLesson.data, published_at: now })
      .eq("content_id", parsed.data.contentId)
      .eq("content_type", "lesson"),
    admin
      .from("content_revisions")
      .update({
        payload: nextLesson.data,
        change_summary: `[HOTFIX] ${parsed.data.reason}`,
        updated_at: now,
      })
      .eq("content_id", parsed.data.contentId)
      .eq("version", published.version)
      .eq("status", "published"),
  ]);
  if (catalogError || revisionError) {
    console.error("applyPublishedLessonHotfix failed", {
      catalog: catalogError?.message,
      revision: revisionError?.message,
    });
    return { status: "error", message: "Chưa thể áp dụng hotfix." };
  }
  await admin.from("audit_logs").insert({
    actor_id: actor.id,
    action: "lesson.hotfix.applied",
    entity_type: "lesson",
    entity_id: parsed.data.contentId,
    metadata: {
      reason: parsed.data.reason,
      version: published.version,
      previous_title: current.data.title,
      next_title: nextLesson.data.title,
      dictation_audio_count: dictations.filter((item) => item.audioUrl).length,
      grammar_point_count: grammar.length,
      grammar_exercise_count: grammarExercises.length,
      grammar_example_audio_count: grammar.reduce(
        (count, point) =>
          count + point.examples.filter((example) => example.audioUrl).length,
        0,
      ),
    },
  });

  revalidatePath("/quan-tri/hotfix");
  revalidatePath("/quan-tri/noi-dung");
  revalidatePath(`/quan-tri/hotfix/${parsed.data.contentId}`);
  revalidatePath("/courses", "layout");
  redirect(`/quan-tri/hotfix/${parsed.data.contentId}?saved=1`);
}
