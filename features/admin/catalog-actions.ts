"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/authorize";
import { toUserFacingError } from "@/lib/errors/user-facing";
import { createClient } from "@/lib/supabase/server";

const id = z.string().trim().regex(/^[a-z0-9][a-z0-9-]*$/).max(200);

export async function createCourseStructure(formData: FormData) {
  await requirePermission("content:publish");
  const parsed = z
    .object({
      id,
      slug: id.max(120),
      titleVi: z.string().trim().min(2).max(160),
      titleKo: z.string().trim().min(1).max(160),
      summary: z.string().trim().min(10).max(1000),
      level: z.enum(["beginner", "intermediate", "advanced"]),
      lessonCount: z.coerce.number().int().positive().max(500),
    })
    .safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) redirect("/quan-tri/cau-truc?error=course-invalid");
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_course_structure", {
    p_id: parsed.data.id,
    p_slug: parsed.data.slug,
    p_title_vi: parsed.data.titleVi,
    p_title_ko: parsed.data.titleKo,
    p_summary: parsed.data.summary,
    p_level: parsed.data.level,
    p_lesson_count: parsed.data.lessonCount,
  });
  if (error) {
    const friendly = toUserFacingError(error, "Không thể tạo khóa học.");
    redirect(`/quan-tri/cau-truc?error=${encodeURIComponent(friendly.message)}`);
  }
  revalidatePath("/quan-tri/cau-truc");
  redirect("/quan-tri/cau-truc?created=course");
}

export async function createModuleStructure(formData: FormData) {
  await requirePermission("content:publish");
  const parsed = z
    .object({
      id,
      courseId: id,
      slug: id.max(120),
      titleVi: z.string().trim().min(2).max(160),
      titleKo: z.string().trim().min(1).max(160),
      sortOrder: z.coerce.number().int().positive().max(500),
    })
    .safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) redirect("/quan-tri/cau-truc?error=module-invalid");
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_module_structure", {
    p_id: parsed.data.id,
    p_course_id: parsed.data.courseId,
    p_slug: parsed.data.slug,
    p_title_vi: parsed.data.titleVi,
    p_title_ko: parsed.data.titleKo,
    p_sort_order: parsed.data.sortOrder,
  });
  if (error) {
    const friendly = toUserFacingError(error, "Không thể tạo chương.");
    redirect(`/quan-tri/cau-truc?error=${encodeURIComponent(friendly.message)}`);
  }
  revalidatePath("/quan-tri/cau-truc");
  redirect("/quan-tri/cau-truc?created=module");
}
