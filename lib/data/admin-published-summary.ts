export type PublishedLessonSummary = {
  contentId: string;
  slug: string;
  version: number;
  title: string;
  summary: string;
  vocabularyCount: number;
  dictationCount: number;
  publishedAt: string;
};

export type PublishedLessonSummaryRow = {
  content_id: string;
  slug: string;
  version: number;
  title: string;
  summary: string;
  vocabulary_count: number;
  dictation_count: number;
  published_at: string;
};

export function mapPublishedLessonSummaryRows(
  rows: PublishedLessonSummaryRow[],
): PublishedLessonSummary[] {
  return rows.map((row) => ({
    contentId: row.content_id,
    slug: row.slug,
    version: row.version,
    title: row.title,
    summary: row.summary,
    vocabularyCount: row.vocabulary_count,
    dictationCount: row.dictation_count,
    publishedAt: row.published_at,
  }));
}

export function isMissingPublishedSummaryRpc(
  error: { code?: string } | null | undefined,
) {
  return error?.code === "PGRST202" || error?.code === "42883";
}
