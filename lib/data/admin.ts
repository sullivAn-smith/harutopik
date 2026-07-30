import "server-only";

import { requirePermission } from "@/lib/auth/authorize";
import { createClient } from "@/lib/supabase/server";
import { lessonSchema, type Lesson } from "@/content/schema";

export type ContentRevisionDTO = {
  id: string;
  contentId: string;
  contentType: string;
  version: number;
  status: string;
  updatedAt: string;
  title: string;
  summary: string;
  createdBy: string;
};

export type CatalogStructureOption = {
  id: string;
  type: "course" | "module";
  parentId: string | null;
  title: string;
};

export async function getCatalogStructureOptions() {
  await requirePermission("content:read-draft");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content_entries")
    .select("id,content_type,parent_id,title,sort_order")
    .in("content_type", ["course", "module"])
    .order("sort_order");
  if (error) throw new Error("Không thể tải cấu trúc khóa học.");
  return (data ?? []).map((entry) => ({
    id: entry.id,
    type: entry.content_type as "course" | "module",
    parentId: entry.parent_id,
    title:
      typeof entry.title === "object" &&
      entry.title &&
      "vi" in entry.title
        ? String(entry.title.vi)
        : entry.id,
  })) satisfies CatalogStructureOption[];
}

export async function getContentRevisions(): Promise<ContentRevisionDTO[]> {
  const actor = await requirePermission("content:read-draft");
  const supabase = await createClient();
  let query = supabase
    .from("content_revisions")
    .select("id,content_id,content_type,version,status,updated_at,created_by,payload")
    .order("updated_at", { ascending: false })
    .is("deleted_at", null)
    .limit(50);
  if (!actor.roles.includes("admin")) {
    query = query.eq("created_by", actor.id);
  }
  const { data, error } = await query;
  if (error) throw new Error("Không thể tải danh sách phiên bản nội dung.");

  return (data ?? []).map((revision) => ({
    id: revision.id,
    contentId: revision.content_id,
    contentType: revision.content_type,
    version: revision.version,
    status: revision.status,
    updatedAt: revision.updated_at,
    title:
      typeof revision.payload === "object" &&
      revision.payload &&
      "title" in revision.payload &&
      typeof revision.payload.title === "object" &&
      revision.payload.title &&
      "vi" in revision.payload.title
        ? String(revision.payload.title.vi)
        : revision.content_id,
    summary:
      typeof revision.payload === "object" &&
      revision.payload &&
      "summary" in revision.payload
        ? String(revision.payload.summary)
        : "",
    createdBy: revision.created_by,
  }));
}

export async function getLessonRevision(
  revisionId: string,
): Promise<{
  id: string;
  status: string;
  lesson: Lesson;
  reviews: Array<{ decision: string; comment: string; createdAt: string }>;
} | null> {
  const actor = await requirePermission("content:read-draft");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content_revisions")
    .select("id,status,payload,created_by")
    .eq("id", revisionId)
    .eq("content_type", "lesson")
    .maybeSingle();
  if (error) throw new Error("Không thể tải bản nội dung.");
  if (!data) return null;
  if (!actor.roles.includes("admin") && data.created_by !== actor.id) return null;

  const lesson = lessonSchema.safeParse(data.payload);
  if (!lesson.success) throw new Error("Dữ liệu bài học không đúng cấu trúc.");
  const { data: reviews } = await supabase
    .from("content_reviews")
    .select("decision,comment,created_at")
    .eq("revision_id", revisionId)
    .order("created_at", { ascending: false });
  return {
    id: data.id,
    status: data.status,
    lesson: lesson.data,
    reviews: (reviews ?? []).map((review) => ({
      decision: review.decision,
      comment: review.comment,
      createdAt: review.created_at,
    })),
  };
}

export async function getReviewQueue() {
  await requirePermission("content:approve");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content_revisions")
    .select("id,content_id,version,status,payload,updated_at")
    .eq("status", "in_review")
    .order("updated_at", { ascending: true });
  if (error) throw new Error("Không thể tải hàng chờ duyệt.");
  return (data ?? []).map((revision) => ({
    id: revision.id,
    contentId: revision.content_id,
    version: revision.version,
    title:
      typeof revision.payload === "object" &&
      revision.payload &&
      "title" in revision.payload
        ? String((revision.payload.title as { vi?: string }).vi ?? revision.content_id)
        : revision.content_id,
    updatedAt: revision.updated_at,
  }));
}

export async function getReleaseQueue() {
  await requirePermission("content:publish");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content_revisions")
    .select("id,content_id,version,status,payload,updated_at,published_at")
    .in("status", ["approved", "published"])
    .order("updated_at", { ascending: false });
  if (error) throw new Error("Không thể tải danh sách phát hành.");
  return (data ?? []).map((revision) => ({
    id: revision.id,
    contentId: revision.content_id,
    version: revision.version,
    status: revision.status,
    title:
      typeof revision.payload === "object" &&
      revision.payload &&
      "title" in revision.payload
        ? String((revision.payload.title as { vi?: string }).vi ?? revision.content_id)
        : revision.content_id,
    updatedAt: revision.updated_at,
    publishedAt: revision.published_at,
  }));
}

export async function getAdminContentStats() {
  await requirePermission("content:approve");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content_revisions")
    .select("status");
  if (error) throw new Error("Không thể tải số liệu nội dung.");
  return (data ?? []).reduce<Record<string, number>>((counts, item) => {
    counts[item.status] = (counts[item.status] ?? 0) + 1;
    return counts;
  }, {});
}

export async function getPublishedLessonsForHotfix() {
  await requirePermission("content:publish");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("published_catalog")
    .select("content_id,slug,version,payload,published_at")
    .eq("content_type", "lesson")
    .order("published_at", { ascending: false });
  if (error) throw new Error("Không thể tải các bài đang phát hành.");
  return (data ?? []).flatMap((row) => {
    const lesson = lessonSchema.safeParse(row.payload);
    return lesson.success
      ? [{
          contentId: row.content_id,
          slug: row.slug,
          version: row.version,
          title: lesson.data.title.vi,
          summary: lesson.data.summary,
          vocabularyCount: lesson.data.vocabulary.length,
          dictationCount: lesson.data.exercises.filter(
            (exercise) => exercise.type === "dictation",
          ).length,
          publishedAt: row.published_at,
        }]
      : [];
  });
}

export async function getPublishedLessonForHotfix(contentId: string) {
  await requirePermission("content:publish");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("published_catalog")
    .select("content_id,slug,version,payload,published_at")
    .eq("content_id", contentId)
    .eq("content_type", "lesson")
    .maybeSingle();
  if (error) throw new Error("Không thể tải bài đang phát hành.");
  if (!data) return null;
  const lesson = lessonSchema.safeParse(data.payload);
  if (!lesson.success) throw new Error("Dữ liệu bài phát hành không hợp lệ.");
  return {
    contentId: data.content_id,
    slug: data.slug,
    version: data.version,
    publishedAt: data.published_at,
    lesson: lesson.data,
  };
}
