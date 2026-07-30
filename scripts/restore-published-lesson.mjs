import fs from "node:fs/promises";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const fileFlag = process.argv.indexOf("--file");
const sourceFile =
  fileFlag >= 0 ? process.argv[fileFlag + 1]?.trim() : undefined;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!sourceFile || !supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Cần --file, NEXT_PUBLIC_SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY.",
  );
}

const lesson = JSON.parse(await fs.readFile(sourceFile, "utf8"));
if (
  !lesson?.id ||
  lesson.contentType === "course" ||
  !Array.isArray(lesson.vocabulary)
) {
  throw new Error("File nguồn không phải payload bài học hợp lệ.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: parent, error: parentError } = await supabase
  .from("content_entries")
  .select("created_by")
  .eq("id", lesson.moduleId)
  .single();
if (parentError) throw parentError;

const vocabularyIds = lesson.vocabulary.map((item) => item.id);
const { data: storedVocabulary, error: vocabularyError } = await supabase
  .from("vocabulary_items")
  .select("id,audio_url,image_url,part_of_speech,level,category")
  .in("id", vocabularyIds);
if (vocabularyError) throw vocabularyError;

const { data: storedExamples, error: examplesError } = await supabase
  .from("vocabulary_examples")
  .select("id,vocabulary_id,audio_url")
  .in("vocabulary_id", vocabularyIds);
if (examplesError) throw examplesError;

const vocabularyById = new Map(
  (storedVocabulary ?? []).map((item) => [item.id, item]),
);
const examplesById = new Map(
  (storedExamples ?? []).map((item) => [item.id, item]),
);

const restoredLesson = {
  ...lesson,
  status: "published",
  vocabulary: lesson.vocabulary.map((item) => {
    const stored = vocabularyById.get(item.id);
    return {
      ...item,
      ...(stored?.audio_url ? { audioUrl: stored.audio_url } : {}),
      ...(stored?.image_url ? { imageUrl: stored.image_url } : {}),
      ...(stored?.part_of_speech
        ? { partOfSpeech: stored.part_of_speech }
        : {}),
      ...(stored?.level ? { level: stored.level } : {}),
      ...(stored?.category ? { category: stored.category } : {}),
      examples: (item.examples ?? []).map((example) => {
        const storedExample = examplesById.get(example.id);
        return {
          ...example,
          ...(storedExample?.audio_url
            ? { audioUrl: storedExample.audio_url }
            : {}),
        };
      }),
    };
  }),
};

const now = new Date().toISOString();
const entry = {
  id: restoredLesson.id,
  content_type: "lesson",
  slug: restoredLesson.slug,
  parent_id: restoredLesson.moduleId,
  title: restoredLesson.title,
  sort_order: restoredLesson.order,
  created_by: parent.created_by,
  updated_at: now,
};
const revision = {
  content_id: restoredLesson.id,
  content_type: "lesson",
  version: restoredLesson.version,
  status: "published",
  payload: restoredLesson,
  change_summary: "Khôi phục Bài 1 sau sự cố xóa revision",
  created_by: parent.created_by,
  reviewed_by: parent.created_by,
  published_by: parent.created_by,
  published_at: now,
  updated_at: now,
};
const published = {
  content_id: restoredLesson.id,
  content_type: "lesson",
  slug: restoredLesson.slug,
  parent_id: restoredLesson.moduleId,
  version: restoredLesson.version,
  payload: restoredLesson,
  published_at: now,
};

const { error: entryError } = await supabase
  .from("content_entries")
  .upsert(entry, { onConflict: "id" });
if (entryError) throw entryError;

const { error: revisionError } = await supabase
  .from("content_revisions")
  .upsert(revision, { onConflict: "content_id,version" });
if (revisionError) throw revisionError;

const { error: publishedError } = await supabase
  .from("published_catalog")
  .upsert(published, { onConflict: "content_id" });
if (publishedError) throw publishedError;

const { error: auditError } = await supabase.from("audit_logs").insert({
  actor_id: parent.created_by,
  action: "content.lesson.restored",
  entity_type: "lesson",
  entity_id: restoredLesson.id,
  metadata: {
    version: restoredLesson.version,
    source: "source-code-recovery",
  },
});
if (auditError) throw auditError;

console.log(
  `Đã khôi phục ${restoredLesson.id}: ${restoredLesson.vocabulary.length} từ, ` +
    `${restoredLesson.grammar.length} điểm ngữ pháp, ${restoredLesson.exercises.length} bài tập.`,
);
