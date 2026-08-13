import type { Course, CourseModule } from "@/content/catalog";
import { lessonSchema, type Lesson, type VocabularyItem } from "@/content/schema";

export type PublishedCatalogRow = {
  content_id: string;
  content_type: "course" | "module" | "lesson";
  parent_id: string | null;
  payload: unknown;
};

/**
 * Course shelves only need lesson identity and display metadata. Keeping the
 * complete vocabulary, grammar and exercise payload in this list can exceed
 * Next.js' 2 MB Data Cache item limit. Full lesson content is still loaded by
 * the dedicated lesson route.
 */
export function compactPublishedCatalogRowsForShells(
  rows: PublishedCatalogRow[],
): PublishedCatalogRow[] {
  return rows.map((row) => {
    if (row.content_type !== "lesson") return row;

    const lesson = row.payload as Partial<Lesson> | null;
    if (!lesson) return row;

    return {
      ...row,
      payload: {
        id: lesson.id,
        slug: lesson.slug,
        courseId: lesson.courseId,
        moduleId: lesson.moduleId,
        order: lesson.order,
        version: lesson.version,
        status: lesson.status,
        title: lesson.title,
        summary: lesson.summary,
        objectives: lesson.objectives,
        vocabulary: [],
        grammar: [],
        exercises: [],
      },
    };
  });
}

type ModulePayload = {
  id?: string;
  slug?: string;
  courseId?: string;
  title?: { ko?: string; vi?: string };
  sortOrder?: number;
  order?: number;
};

function parseModule(row: PublishedCatalogRow): CourseModule | null {
  const payload = row.payload as ModulePayload;
  const courseId = payload?.courseId ?? row.parent_id;
  if (
    !payload ||
    !courseId ||
    typeof payload.slug !== "string" ||
    typeof payload.title?.ko !== "string" ||
    typeof payload.title?.vi !== "string"
  ) {
    return null;
  }

  return {
    id: payload.id ?? row.content_id,
    slug: payload.slug,
    courseId,
    title: { ko: payload.title.ko, vi: payload.title.vi },
    order: payload.sortOrder ?? payload.order ?? Number.MAX_SAFE_INTEGER,
    lessons: [],
  };
}

export function buildPublishedCourses(
  rows: PublishedCatalogRow[],
  normalizedVocabulary = new Map<string, VocabularyItem[]>(),
): Course[] {
  const modules = new Map<string, CourseModule>();
  for (const row of rows) {
    if (row.content_type !== "module") continue;
    const courseModule = parseModule(row);
    if (courseModule) modules.set(row.content_id, courseModule);
  }

  const lessonsByCourse = new Map<string, Lesson[]>();
  const lessonsByModule = new Map<string, Lesson[]>();
  for (const row of rows) {
    if (row.content_type !== "lesson") continue;
    const parsed = lessonSchema.safeParse(row.payload);
    if (!parsed.success || parsed.data.status !== "published") continue;

    const vocabulary = normalizedVocabulary.get(parsed.data.id);
    const snapshotVocabularyById = new Map(
      parsed.data.vocabulary.map((item) => [item.id, item]),
    );
    const mergedVocabulary = vocabulary?.map((item) => {
      const snapshot = snapshotVocabularyById.get(item.id);
      return !item.partOfSpeech && snapshot?.partOfSpeech
        ? { ...item, partOfSpeech: snapshot.partOfSpeech }
        : item;
    });
    const lesson = mergedVocabulary?.length
      ? { ...parsed.data, vocabulary: mergedVocabulary }
      : parsed.data;
    const moduleId = row.parent_id ?? lesson.moduleId;
    const courseId = modules.get(moduleId)?.courseId ?? lesson.courseId;
    lessonsByCourse.set(courseId, [
      ...(lessonsByCourse.get(courseId) ?? []),
      lesson,
    ]);
    lessonsByModule.set(moduleId, [
      ...(lessonsByModule.get(moduleId) ?? []),
      lesson,
    ]);
  }

  return rows
    .filter((row) => row.content_type === "course")
    .flatMap((row) => {
      const payload = row.payload as Omit<Course, "lessons" | "modules">;
      if (
        !payload ||
        typeof payload.id !== "string" ||
        typeof payload.slug !== "string" ||
        typeof payload.title?.ko !== "string" ||
        typeof payload.title?.vi !== "string" ||
        typeof payload.summary !== "string"
      ) {
        return [];
      }

      const courseModules = [...modules.values()]
        .filter((courseModule) => courseModule.courseId === payload.id)
        .map((courseModule) => {
          const lessons = (lessonsByModule.get(courseModule.id) ?? []).sort(
            (a, b) => a.order - b.order,
          );
          return {
            ...courseModule,
            order: courseModule.order === Number.MAX_SAFE_INTEGER
              ? (lessons[0]?.order ?? courseModule.order)
              : courseModule.order,
            lessons,
          };
        })
        .sort((a, b) => a.order - b.order);

      return [{
        ...payload,
        lessons: (lessonsByCourse.get(payload.id) ?? []).sort(
          (a, b) => a.order - b.order,
        ),
        modules: courseModules,
      }];
    });
}
