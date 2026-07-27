import "server-only";

import { createClient } from "@supabase/supabase-js";
import { courses as sourceCourses } from "@/content/catalog";
import { lessonSchema } from "@/content/schema";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getPublishedVocabularyByLesson } from "@/lib/data/published-vocabulary";

type PublishedRow = {
  content_id: string;
  content_type: "course" | "module" | "lesson";
  parent_id: string | null;
  payload: unknown;
};

export async function getPublishedCourses() {
  if (!isSupabaseConfigured()) return sourceCourses;
  const { supabaseUrl, supabasePublishableKey } = getSupabaseConfig();
  const supabase = createClient(supabaseUrl, supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase
    .from("published_catalog")
    .select("content_id,content_type,parent_id,payload");

  if (error || !data?.length) return sourceCourses;

  const rows = data as PublishedRow[];
  const lessonRows = rows.filter((row) => row.content_type === "lesson");
  const normalizedVocabulary = await getPublishedVocabularyByLesson(
    lessonRows.map((row) => row.content_id),
  );
  const modules = new Map(
    rows
      .filter((row) => row.content_type === "module")
      .map((row) => [
        row.content_id,
        row.payload as { courseId?: string },
      ]),
  );
  const lessonsByCourse = new Map<string, Array<ReturnType<typeof lessonSchema.parse>>>();

  for (const row of lessonRows) {
    const parsed = lessonSchema.safeParse(row.payload);
    if (!parsed.success || parsed.data.status !== "published") continue;
    const moduleCourseId = row.parent_id
      ? modules.get(row.parent_id)?.courseId
      : undefined;
    const courseId = moduleCourseId ?? parsed.data.courseId;
    const vocabulary = normalizedVocabulary.get(parsed.data.id);
    lessonsByCourse.set(courseId, [
      ...(lessonsByCourse.get(courseId) ?? []),
      vocabulary?.length ? { ...parsed.data, vocabulary } : parsed.data,
    ]);
  }

  const databaseCourses = rows
    .filter((row) => row.content_type === "course")
    .flatMap((row) => {
      const payload = row.payload as (typeof sourceCourses)[number];
      if (
        !payload ||
        typeof payload.id !== "string" ||
        typeof payload.slug !== "string" ||
        !payload.title
      ) {
        return [];
      }
      return [
        {
          ...payload,
          lessons: (lessonsByCourse.get(payload.id) ?? []).sort(
            (a, b) => a.order - b.order,
          ),
        },
      ];
    });

  return databaseCourses.length > 0 ? databaseCourses : sourceCourses;
}
