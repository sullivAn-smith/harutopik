import "server-only";

import { createClient } from "@supabase/supabase-js";
import { courses as sourceCourses } from "@/content/catalog";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getPublishedVocabularyByLesson } from "@/lib/data/published-vocabulary";
import {
  buildPublishedCourses,
  type PublishedCatalogRow,
} from "@/lib/data/published-catalog-normalizer";

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

  const rows = data as PublishedCatalogRow[];
  const lessonRows = rows.filter((row) => row.content_type === "lesson");
  const normalizedVocabulary = await getPublishedVocabularyByLesson(
    lessonRows.map((row) => row.content_id),
  );
  const databaseCourses = buildPublishedCourses(rows, normalizedVocabulary);

  return databaseCourses.length > 0 ? databaseCourses : sourceCourses;
}
