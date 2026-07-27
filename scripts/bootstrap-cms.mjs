import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const emailFlagIndex = process.argv.indexOf("--email");
const ownerEmail =
  emailFlagIndex >= 0 ? process.argv[emailFlagIndex + 1]?.trim() : "";
const grantAdmin = process.argv.includes("--grant-admin");
const catalogUrl =
  process.env.CMS_CATALOG_URL ?? "http://127.0.0.1:3000/api/v1/catalog";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!ownerEmail || !supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Cần --email, NEXT_PUBLIC_SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY.",
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
let owner;
try {
  const { data: usersPage, error: usersError } =
    await supabase.auth.admin.listUsers({ page: 1, perPage: 1_000 });
  if (usersError) throw usersError;
  owner = usersPage.users.find(
    (user) => user.email?.toLowerCase() === ownerEmail.toLowerCase(),
  );
} catch {
  const { data: roleRows, error: rolesError } = await supabase
    .from("user_roles")
    .select("user_id");
  if (rolesError) throw rolesError;
  const userIds = [...new Set((roleRows ?? []).map((row) => row.user_id))];
  if (userIds.length === 1) owner = { id: userIds[0], email: ownerEmail };
}
if (!owner) {
  throw new Error(
    "Không thể xác định duy nhất tài khoản chủ dự án. Hãy dùng service-role JWT hoặc truyền user ID.",
  );
}

const catalogResponse = await fetch(catalogUrl);
if (!catalogResponse.ok) {
  throw new Error(`Không thể đọc catalog nguồn (${catalogResponse.status}).`);
}
const catalogEnvelope = await catalogResponse.json();
const courses = catalogEnvelope.data?.courses;
if (!Array.isArray(courses) || courses.length === 0) {
  throw new Error("Catalog nguồn không có khóa học.");
}

const entries = [];
const revisions = [];
const published = [];

for (const course of courses) {
  entries.push({
    id: course.id,
    content_type: "course",
    slug: course.slug,
    parent_id: null,
    title: course.title,
    sort_order: 1,
    created_by: owner.id,
  });
  revisions.push({
    content_id: course.id,
    content_type: "course",
    version: 1,
    status: "published",
    payload: { ...course, lessons: undefined },
    change_summary: "Nhập từ catalog source code ban đầu",
    created_by: owner.id,
    reviewed_by: owner.id,
    published_by: owner.id,
    published_at: new Date().toISOString(),
  });
  published.push({
    content_id: course.id,
    content_type: "course",
    slug: course.slug,
    parent_id: null,
    version: 1,
    payload: { ...course, lessons: undefined },
  });

  const modules = new Map(
    course.lessons.map((lesson) => [
      lesson.moduleId,
      {
        id: lesson.moduleId,
        slug: lesson.moduleId.replace(/^module-/, ""),
        title: { vi: "Nền tảng", ko: "기초" },
      },
    ]),
  );
  for (const moduleRecord of modules.values()) {
    const modulePayload = {
      id: moduleRecord.id,
      courseId: course.id,
      slug: moduleRecord.slug,
      title: moduleRecord.title,
      order: 1,
      status: "published",
    };
    entries.push({
      id: moduleRecord.id,
      content_type: "module",
      slug: moduleRecord.slug,
      parent_id: course.id,
      title: moduleRecord.title,
      sort_order: 1,
      created_by: owner.id,
    });
    revisions.push({
      content_id: moduleRecord.id,
      content_type: "module",
      version: 1,
      status: "published",
      payload: modulePayload,
      change_summary: "Nhập từ catalog source code ban đầu",
      created_by: owner.id,
      reviewed_by: owner.id,
      published_by: owner.id,
      published_at: new Date().toISOString(),
    });
    published.push({
      content_id: moduleRecord.id,
      content_type: "module",
      slug: moduleRecord.slug,
      parent_id: course.id,
      version: 1,
      payload: modulePayload,
    });
  }

  for (const lesson of course.lessons) {
    entries.push({
      id: lesson.id,
      content_type: "lesson",
      slug: lesson.slug,
      parent_id: lesson.moduleId,
      title: lesson.title,
      sort_order: lesson.order,
      created_by: owner.id,
    });
    revisions.push({
      content_id: lesson.id,
      content_type: "lesson",
      version: lesson.version,
      status: "published",
      payload: lesson,
      change_summary: "Nhập từ catalog source code ban đầu",
      created_by: owner.id,
      reviewed_by: owner.id,
      published_by: owner.id,
      published_at: new Date().toISOString(),
    });
    published.push({
      content_id: lesson.id,
      content_type: "lesson",
      slug: lesson.slug,
      parent_id: lesson.moduleId,
      version: lesson.version,
      payload: lesson,
    });
  }
}

if (grantAdmin) {
  const { error: roleError } = await supabase.from("user_roles").upsert(
    { user_id: owner.id, role: "admin", granted_by: owner.id },
    { onConflict: "user_id,role" },
  );
  if (roleError) throw roleError;
}

const { error: entryError } = await supabase
  .from("content_entries")
  .upsert(entries, { onConflict: "id" });
if (entryError) throw entryError;

const { error: revisionError } = await supabase
  .from("content_revisions")
  .upsert(revisions, { onConflict: "content_id,version" });
if (revisionError) throw revisionError;

const { error: publishedError } = await supabase
  .from("published_catalog")
  .upsert(published, { onConflict: "content_id" });
if (publishedError) throw publishedError;

console.log(
  `CMS ready: ${entries.length} nội dung được nhập cho ${ownerEmail}.`,
);
