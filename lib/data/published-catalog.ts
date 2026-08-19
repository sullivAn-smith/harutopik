import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { courses as sourceCourses, getCourseBySlug, getLessonBySlug, type Course } from "@/content/catalog";
import { lessonSchema, type Lesson } from "@/content/schema";
import { compressJson, decompressJson } from "@/lib/data/compressed-json";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getPublishedVocabularyByLesson } from "@/lib/data/published-vocabulary";
import {
  buildPublishedCourses,
  compactPublishedCatalogRowsForShells,
  type PublishedCatalogRow,
} from "@/lib/data/published-catalog-normalizer";
import {
  publishedLearningCacheSeconds,
  publishedLearningCacheTag,
} from "@/lib/data/published-cache";

const loadPublishedCatalogRows = async (): Promise<PublishedCatalogRow[] | null> => {
  if (!isSupabaseConfigured()) return null;
  const { supabaseUrl, supabasePublishableKey } = getSupabaseConfig();
  const supabase = createClient(supabaseUrl, supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase
    .from("published_catalog")
    .select("content_id,content_type,parent_id,payload");

  if (error || !data?.length) return null;

  return data as PublishedCatalogRow[];
};

const getPublishedCatalogRowsAcrossRequests = unstable_cache(
  loadPublishedCatalogRows,
  // v3 invalidates the cached local fallback that could hide newly published
  // courses and lessons after the curriculum library migration.
  ["published-catalog-rows-v3"],
  { tags: [publishedLearningCacheTag], revalidate: publishedLearningCacheSeconds },
);

const loadPublishedCatalogShellRows = async (): Promise<PublishedCatalogRow[] | null> => {
  if (!isSupabaseConfigured()) return null;
  const { supabaseUrl, supabasePublishableKey } = getSupabaseConfig();
  const supabase = createClient(supabaseUrl, supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.rpc("get_published_catalog_shells");
  if (!error && data?.length) return data as PublishedCatalogRow[];

  // Keep deployments functional while the additive migration rolls out.
  if (error?.code === "PGRST202" || error?.code === "42883") {
    const rows = await loadPublishedCatalogRows();
    return rows ? compactPublishedCatalogRowsForShells(rows) : null;
  }
  return null;
};

const loadPublishedCourseShells = async () => {
  const rows = await loadPublishedCatalogShellRows();
  if (!rows) return sourceCourses;

  const databaseCourses = buildPublishedCourses(rows);
  return databaseCourses.length > 0 ? databaseCourses : sourceCourses;
};

const getPublishedCourseShellsAcrossRequests = unstable_cache(
  loadPublishedCourseShells,
  ["published-course-shells-v3"],
  { tags: [publishedLearningCacheTag], revalidate: publishedLearningCacheSeconds },
);

export const getPublishedCourseShells = cache(
  getPublishedCourseShellsAcrossRequests,
);

const loadPublishedCourses = async () => {
  const rows = await getPublishedCatalogRowsAcrossRequests();
  if (!rows) return sourceCourses;

  const lessonRows = rows.filter((row) => row.content_type === "lesson");
  const normalizedVocabulary = await getPublishedVocabularyByLesson(
    lessonRows.map((row) => row.content_id),
  );
  const databaseCourses = buildPublishedCourses(rows, normalizedVocabulary);

  return databaseCourses.length > 0 ? databaseCourses : sourceCourses;
};

const getCompressedPublishedCoursesAcrossRequests = unstable_cache(
  async () => compressJson(await loadPublishedCourses()),
  ["published-courses-compressed-v4"],
  { tags: [publishedLearningCacheTag], revalidate: publishedLearningCacheSeconds },
);

export const getPublishedCourses = cache(async (): Promise<Course[]> =>
  decompressJson<Course[]>(await getCompressedPublishedCoursesAcrossRequests()),
);

const loadPublishedLessonRouteData = async (
  courseSlug: string,
  lessonSlug: string,
): Promise<{ lesson: Lesson; courseTitle: string } | null> => {
  const fallbackLesson = getLessonBySlug(courseSlug, lessonSlug) ?? null;
  const fallbackCourse = getCourseBySlug(courseSlug);
  const fallback = fallbackLesson && fallbackCourse
    ? { lesson: fallbackLesson, courseTitle: fallbackCourse.title.vi }
    : null;
  if (!isSupabaseConfigured()) return fallback;

  const { supabaseUrl, supabasePublishableKey } = getSupabaseConfig();
  const supabase = createClient(supabaseUrl, supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const [{ data: course, error: courseError }, { data: lessonRow, error: lessonError }] = await Promise.all([
    supabase.from("published_catalog").select("content_id,payload").eq("content_type", "course").eq("slug", courseSlug).maybeSingle(),
    supabase.from("published_catalog").select("content_id,payload").eq("content_type", "lesson").eq("slug", lessonSlug).maybeSingle(),
  ]);
  if (courseError || lessonError || !course || !lessonRow) return fallback;

  const parsed = lessonSchema.safeParse(lessonRow.payload);
  if (!parsed.success || parsed.data.status !== "published" || parsed.data.courseId !== course.content_id) return fallback;
  const coursePayload = course.payload as { title?: { vi?: unknown } } | null;
  const courseTitle = typeof coursePayload?.title?.vi === "string"
    ? coursePayload.title.vi
    : fallbackCourse?.title.vi ?? "Khóa học tiếng Hàn";
  const normalizedVocabulary = await getPublishedVocabularyByLesson([lessonRow.content_id]);
  const vocabulary = normalizedVocabulary.get(lessonRow.content_id);
  if (!vocabulary?.length) return { lesson: parsed.data, courseTitle };

  const snapshotVocabularyById = new Map(parsed.data.vocabulary.map((item) => [item.id, item]));
  const mergedVocabulary = vocabulary.map((item) => {
    const snapshot = snapshotVocabularyById.get(item.id);
    return !item.partOfSpeech && snapshot?.partOfSpeech
      ? { ...item, partOfSpeech: snapshot.partOfSpeech }
      : item;
  });
  return { lesson: { ...parsed.data, vocabulary: mergedVocabulary }, courseTitle };
};

const getPublishedLessonAcrossRequests = unstable_cache(
  loadPublishedLessonRouteData,
  ["published-lesson-route-v3"],
  { tags: [publishedLearningCacheTag], revalidate: publishedLearningCacheSeconds },
);

export const getPublishedLessonRouteData = cache(getPublishedLessonAcrossRequests);
