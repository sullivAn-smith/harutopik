"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { lessonSchema } from "@/content/schema";
import {
  lessonDraftFormSchema,
  parseGrammarJson,
  parseVocabularyLines,
  type ContentFormState,
} from "@/features/admin/content-schema";
import { requirePermission } from "@/lib/auth/authorize";
import { toUserFacingError } from "@/lib/errors/user-facing";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { evaluateLessonEligibility } from "@/lib/vocabulary/eligibility";

async function revisionPassesEligibility(
  supabase: Awaited<ReturnType<typeof createClient>>,
  revisionId: string,
) {
  const { data, error } = await supabase
    .from("content_revisions")
    .select("content_type,payload")
    .eq("id", revisionId)
    .maybeSingle();
  if (error || !data) return false;
  if (data.content_type !== "lesson") return true;
  const lesson = lessonSchema.safeParse(data.payload);
  return lesson.success && evaluateLessonEligibility(lesson.data).canSubmit;
}

async function notifyWorkflow(
  revisionId: string,
  event: "submitted" | "approved" | "changes_requested",
) {
  const admin = createAdminClient();
  const { data: revision } = await admin
    .from("content_revisions")
    .select("created_by,content_id,payload")
    .eq("id", revisionId)
    .maybeSingle();
  if (!revision) return;
  const title =
    typeof revision.payload === "object" &&
    revision.payload &&
    "title" in revision.payload
      ? String((revision.payload.title as { vi?: string }).vi ?? revision.content_id)
      : revision.content_id;
  if (event === "submitted") {
    const { data: admins } = await admin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    if (!admins?.length) return;
    await admin.from("notifications").insert(
      admins.map(({ user_id }) => ({
        user_id,
        type: "content_submitted",
        title: "Có bài mới chờ duyệt",
        message: `“${title}” vừa được gửi duyệt.`,
        href: `/quan-tri/duyet/${revisionId}`,
      })),
    );
    return;
  }
  await admin.from("notifications").insert({
    user_id: revision.created_by,
    type: event === "approved" ? "content_approved" : "content_changes_requested",
    title: event === "approved" ? "Bài học đã được duyệt" : "Bài học cần chỉnh sửa",
    message:
      event === "approved"
        ? `“${title}” đã được admin duyệt và đang chờ phát hành.`
        : `“${title}” đã được trả về để bạn chỉnh sửa.`,
    href: `/bien-tap/noi-dung/${revisionId}`,
  });
}

export async function createLessonDraft(
  _state: ContentFormState,
  formData: FormData,
): Promise<ContentFormState> {
  await requirePermission("content:create");
  const parsed = lessonDraftFormSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) {
    return {
      status: "error",
      message: "Hãy kiểm tra lại các trường được đánh dấu.",
      fields: parsed.error.flatten().fieldErrors,
    };
  }

  let vocabulary;
  try {
    vocabulary = parseVocabularyLines(
      parsed.data.vocabulary,
      parsed.data.id,
    );
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Dữ liệu từ vựng chưa hợp lệ.",
      fields: { vocabulary: ["Kiểm tra lại định dạng từng dòng."] },
    };
  }

  let grammar;
  try {
    grammar = parseGrammarJson(parsed.data.grammarJson, parsed.data.id);
  } catch {
    return {
      status: "error",
      message: "Điểm ngữ pháp cần đủ cấu trúc và ít nhất một câu ví dụ.",
      fields: { grammarJson: ["Hãy hoàn thiện hoặc xóa mục ngữ pháp còn trống."] },
    };
  }

  const lesson = lessonSchema.safeParse({
    id: parsed.data.id,
    slug: parsed.data.slug,
    courseId: parsed.data.courseId,
    moduleId: parsed.data.moduleId,
    order: parsed.data.order,
    version: 1,
    status: "draft",
    title: { vi: parsed.data.titleVi, ko: parsed.data.titleKo },
    summary: parsed.data.summary,
    objectives: parsed.data.objectives
      .split("\n")
      .map((objective) => objective.trim())
      .filter(Boolean),
    vocabulary,
    grammar,
    exercises: [],
  });
  if (!lesson.success) {
    return {
      status: "error",
      message: "Bài học chưa vượt qua kiểm tra cấu trúc nội dung.",
      fields: lesson.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_lesson_draft", {
    p_content_id: lesson.data.id,
    p_slug: lesson.data.slug,
    p_course_id: lesson.data.courseId,
    p_module_id: lesson.data.moduleId,
    p_title: lesson.data.title,
    p_sort_order: lesson.data.order,
    p_payload: lesson.data,
    p_change_summary: parsed.data.changeSummary,
  });

  if (error) {
    const duplicate = error.code === "23505";
    const invalidCatalog = error.message.includes("invalid_course_module");
    console.error("create_lesson_draft failed", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return {
      status: "error",
      message: duplicate
        ? "ID hoặc slug này đã tồn tại."
        : invalidCatalog
          ? "Khóa học hoặc học phần chưa được khởi tạo. Admin cần cập nhật cấu trúc khóa học."
        : "Chưa thể tạo bản nháp. Vui lòng thử lại.",
    };
  }

  const destination =
    formData.get("returnTo") === "/bien-tap/noi-dung"
      ? "/bien-tap/noi-dung"
      : "/quan-tri/noi-dung";
  revalidatePath(destination);
  redirect(`${destination}?created=1`);
}

export async function updateLessonDraft(
  _state: ContentFormState,
  formData: FormData,
): Promise<ContentFormState> {
  await requirePermission("content:edit");
  const revisionId = formData.get("revisionId");
  const parsed = lessonDraftFormSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (typeof revisionId !== "string" || !revisionId || !parsed.success) {
    return {
      status: "error",
      message: "Hãy kiểm tra lại các trường được đánh dấu.",
      fields: parsed.success ? undefined : parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data: currentRevision, error: currentError } = await supabase
    .from("content_revisions")
    .select("payload")
    .eq("id", revisionId)
    .maybeSingle();
  const currentLesson = lessonSchema.safeParse(currentRevision?.payload);
  if (currentError || !currentLesson.success) {
    return {
      status: "error",
      message: "Không thể tải dữ liệu hiện tại của bài học.",
    };
  }

  let grammar;
  try {
    grammar = parseGrammarJson(parsed.data.grammarJson, parsed.data.id);
  } catch {
    return {
      status: "error",
      message: "Điểm ngữ pháp cần đủ cấu trúc và ít nhất một câu ví dụ.",
      fields: { grammarJson: ["Hãy hoàn thiện hoặc xóa mục ngữ pháp còn trống."] },
    };
  }

  const lesson = lessonSchema.safeParse({
    id: parsed.data.id,
    slug: parsed.data.slug,
    courseId: parsed.data.courseId,
    moduleId: parsed.data.moduleId,
    order: parsed.data.order,
    version: Number(formData.get("version") ?? 1),
    status: "draft",
    title: { vi: parsed.data.titleVi, ko: parsed.data.titleKo },
    summary: parsed.data.summary,
    objectives: parsed.data.objectives.split("\n").map((item) => item.trim()).filter(Boolean),
    vocabulary: currentLesson.data.vocabulary,
    grammar,
    exercises: currentLesson.data.exercises,
  });
  if (!lesson.success) {
    return { status: "error", message: "Bài học chưa vượt qua kiểm tra cấu trúc nội dung." };
  }

  const { error } = await supabase.rpc("update_lesson_draft", {
    p_revision_id: revisionId,
    p_slug: lesson.data.slug,
    p_course_id: lesson.data.courseId,
    p_module_id: lesson.data.moduleId,
    p_title: lesson.data.title,
    p_sort_order: lesson.data.order,
    p_payload: lesson.data,
    p_change_summary: parsed.data.changeSummary,
  });
  if (error) {
    return {
      status: "error",
      message: toUserFacingError(error, "Không thể cập nhật bản nháp.").message,
    };
  }

  const destination =
    formData.get("returnTo") === "/bien-tap/noi-dung"
      ? "/bien-tap/noi-dung"
      : "/quan-tri/noi-dung";
  revalidatePath(destination);
  redirect(`${destination}?updated=1`);
}

async function transitionRevision(
  formData: FormData,
  targetStatus: "in_review" | "approved" | "published",
) {
  const permission =
    targetStatus === "in_review"
      ? "content:submit-review"
      : targetStatus === "approved"
        ? "content:approve"
        : "content:publish";
  await requirePermission(permission);
  const revisionId = formData.get("revisionId");
  const destination =
    formData.get("returnTo") === "/bien-tap/noi-dung"
      ? "/bien-tap/noi-dung"
      : formData.get("returnTo") === "/quan-tri/phat-hanh"
        ? "/quan-tri/phat-hanh"
      : "/quan-tri/noi-dung";
  if (typeof revisionId !== "string" || !revisionId) {
    redirect(`${destination}?workflow=invalid`);
  }

  const supabase = await createClient();
  if (!(await revisionPassesEligibility(supabase, revisionId))) {
    redirect(`${destination}?workflow=validation`);
  }
  const { error } = await supabase.rpc("transition_content_revision", {
    p_revision_id: revisionId,
    p_target_status: targetStatus,
  });
  if (error) {
    const friendly = toUserFacingError(error, "Không thể chuyển trạng thái bài.");
    redirect(
      `${destination}?workflow=error&errorMessage=${encodeURIComponent(friendly.message)}`,
    );
  }

  if (targetStatus === "in_review") {
    await notifyWorkflow(revisionId, "submitted");
  }
  revalidatePath(destination);
  revalidatePath("/thong-bao");
  revalidatePath("/courses/[courseSlug]", "page");
  revalidatePath("/api/v1/catalog");
  redirect(`${destination}?workflow=${targetStatus}`);
}

export async function submitRevision(formData: FormData) {
  await transitionRevision(formData, "in_review");
}

export async function approveRevision(formData: FormData) {
  await transitionRevision(formData, "approved");
}

export async function publishRevision(formData: FormData) {
  await transitionRevision(formData, "published");
}

export async function reviewRevision(formData: FormData) {
  await requirePermission("content:approve");
  const revisionId = formData.get("revisionId");
  const decision = formData.get("decision");
  const comment = formData.get("comment");
  if (
    typeof revisionId !== "string" ||
    !revisionId ||
    (decision !== "approved" && decision !== "changes_requested") ||
    typeof comment !== "string" ||
    comment.trim().length < 3
  ) {
    redirect(`/quan-tri/duyet/${revisionId}?review=invalid`);
  }

  const supabase = await createClient();
  if (
    decision === "approved" &&
    !(await revisionPassesEligibility(supabase, revisionId))
  ) {
    redirect(`/quan-tri/duyet/${revisionId}?review=validation`);
  }
  const { error } = await supabase.rpc("review_content_revision", {
    p_revision_id: revisionId,
    p_decision: decision,
    p_comment: comment.trim(),
  });
  if (error) {
    const friendly = toUserFacingError(error, "Không thể lưu quyết định duyệt.");
    redirect(
      `/quan-tri/duyet/${revisionId}?review=error&errorMessage=${encodeURIComponent(friendly.message)}`,
    );
  }

  await notifyWorkflow(revisionId, decision);
  revalidatePath("/quan-tri");
  revalidatePath("/quan-tri/duyet");
  revalidatePath("/quan-tri/noi-dung");
  revalidatePath("/thong-bao");
  redirect(`/quan-tri/duyet?review=${decision}`);
}

export async function unpublishRevision(formData: FormData) {
  await requirePermission("content:unpublish");
  const revisionId = formData.get("revisionId");
  const note = formData.get("note");
  if (typeof revisionId !== "string" || !revisionId) {
    redirect("/quan-tri/phat-hanh?release=invalid");
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("unpublish_content", {
    p_revision_id: revisionId,
    p_note: typeof note === "string" ? note.trim() : "",
  });
  if (error) {
    const friendly = toUserFacingError(error, "Không thể tạm gỡ bài.");
    redirect(
      `/quan-tri/phat-hanh?release=error&errorMessage=${encodeURIComponent(friendly.message)}`,
    );
  }

  revalidatePath("/quan-tri/phat-hanh");
  revalidatePath("/courses/[courseSlug]", "page");
  revalidatePath("/api/v1/catalog");
  redirect("/quan-tri/phat-hanh?release=unpublished");
}

export async function createNewRevision(formData: FormData) {
  await requirePermission("content:create");
  const revisionId = formData.get("revisionId");
  const returnTo =
    formData.get("returnTo") === "/bien-tap/noi-dung"
      ? "/bien-tap/noi-dung"
      : "/quan-tri/noi-dung";
  if (typeof revisionId !== "string" || !revisionId) {
    redirect(`${returnTo}?version=invalid`);
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_new_content_revision", {
    p_source_revision_id: revisionId,
    p_change_summary: "Tạo phiên bản cập nhật mới",
  });
  if (error || typeof data !== "string") {
    const friendly = toUserFacingError(
      error ?? new Error("create_new_content_revision returned no id"),
      "Không thể tạo phiên bản nội dung mới.",
    );
    redirect(
      `${returnTo}?version=error&errorMessage=${encodeURIComponent(friendly.message)}`,
    );
  }
  revalidatePath(returnTo);
  redirect(
    returnTo.startsWith("/bien-tap")
      ? `/bien-tap/noi-dung/${data}`
      : `/quan-tri/noi-dung/${data}`,
  );
}

export async function deleteOrArchiveLesson(formData: FormData) {
  await requirePermission("content:delete-own");
  const revisionId = formData.get("revisionId");
  const returnTo =
    formData.get("returnTo") === "/quan-tri/noi-dung"
      ? "/quan-tri/noi-dung"
      : "/bien-tap/noi-dung";
  if (typeof revisionId !== "string" || !revisionId) {
    redirect(`${returnTo}?delete=invalid`);
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("delete_or_archive_lesson", {
    p_revision_id: revisionId,
  });
  if (error) {
    const friendly = toUserFacingError(error, "Chưa thể xóa bài học.");
    redirect(
      `${returnTo}?delete=error&errorMessage=${encodeURIComponent(friendly.message)}`,
    );
  }
  revalidatePath("/bien-tap/noi-dung");
  revalidatePath("/quan-tri/noi-dung");
  redirect(`${returnTo}?delete=${data === "archived" ? "archived" : "done"}`);
}

export async function prepareAdminRevisionEdit(formData: FormData) {
  await requirePermission("content:publish");
  const revisionId = formData.get("revisionId");
  if (typeof revisionId !== "string" || !revisionId) {
    redirect("/quan-tri/noi-dung?quickEdit=invalid");
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("prepare_admin_revision_edit", {
    p_revision_id: revisionId,
  });
  if (error || typeof data !== "string") {
    const friendly = toUserFacingError(
      error ?? new Error("prepare_admin_revision_edit returned no id"),
      "Chưa thể mở bản chỉnh sửa cho admin.",
    );
    redirect(
      `/quan-tri/noi-dung?quickEdit=error&errorMessage=${encodeURIComponent(friendly.message)}`,
    );
  }
  revalidatePath("/quan-tri/noi-dung");
  revalidatePath("/quan-tri/duyet");
  revalidatePath("/quan-tri/phat-hanh");
  redirect(`/quan-tri/noi-dung/${data}?quickEdit=ready`);
}
