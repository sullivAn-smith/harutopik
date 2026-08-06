export const topikShelfDefinitions = [1, 2, 3, 4, 5, 6].map((level) => ({
  id: `topik-${level}`,
  level,
  label: `TOPIK ${level}`,
  expectedSlug: `topik-${level}`,
}));

export type TopikShelfItem<T> = (typeof topikShelfDefinitions)[number] & {
  course: T | null;
};

export function buildTopikShelf<T extends { slug: string }>(
  publishedCourses: readonly T[],
): TopikShelfItem<T>[] {
  return topikShelfDefinitions.map((definition) => ({
    ...definition,
    course: publishedCourses.find(
      (course) => course.slug === definition.expectedSlug,
    ) ?? null,
  }));
}

export function getAdditionalPublishedCourses<T extends { slug: string }>(
  publishedCourses: readonly T[],
) {
  const reservedSlugs = new Set(
    topikShelfDefinitions.map((definition) => definition.expectedSlug),
  );
  return publishedCourses.filter((course) => !reservedSlugs.has(course.slug));
}
