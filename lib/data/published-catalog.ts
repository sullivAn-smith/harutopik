import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { courses as sourceCourses, getCourseBySlug, getLessonBySlug } from "@/content/catalog";
import { lessonSchema, type Lesson } from "@/content/schema";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getPublishedVocabularyByLesson } from "@/lib/data/published-vocabulary";
import {
  buildPublishedCourses,
  type PublishedCatalogRow,
} from "@/lib/data/published-catalog-normalizer";
import { publishedLearningCacheTag } from "@/lib/data/published-cache";

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
  ["published-catalog-rows-v2"],
  { tags: [publishedLearningCacheTag], revalidate: 300 },
);

const loadPublishedCourseShells = async () => {
  const rows = await getPublishedCatalogRowsAcrossRequests();
  if (!rows) return sourceCourses;

  const databaseCourses = buildPublishedCourses(rows);
  return databaseCourses.length > 0 ? databaseCourses : sourceCourses;
};

const getPublishedCourseShellsAcrossRequests = unstable_cache(
  loadPublishedCourseShells,
  ["published-course-shells-v2"],
  { tags: [publishedLearningCacheTag], revalidate: 300 },
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

const getPublishedCoursesAcrossRequests = unstable_cache(
  loadPublishedCourses,
  ["published-courses-v2"],
  { tags: [publishedLearningCacheTag], revalidate: 300 },
);

export const getPublishedCourses = cache(getPublishedCoursesAcrossRequests);

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
  ["published-lesson-route-v2"],
  { tags: [publishedLearningCacheTag], revalidate: 300 },
);

export const getPublishedLessonRouteData = cache(getPublishedLessonAcrossRequests);
