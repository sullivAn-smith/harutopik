"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/authorize";
import { toUserFacingError } from "@/lib/errors/user-facing";
import { createClient } from "@/lib/supabase/server";
import {
  parseAnswerLines,
  parseExamplesJson,
  vocabularyFormSchema,
  type VocabularyFormState,
} from "./schema";

function parseForm(formData: FormData): {
  error?: VocabularyFormState;
  data?: ReturnType<typeof vocabularyFormSchema.parse>;
  examples?: Array<{ korean: string; vietnamese: string }>;
} {
  const parsed = vocabularyFormSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) {
    return {
      error: {
        status: "error",
        message: "Hãy kiểm tra lại các trường được đánh dấu.",
        fields: parsed.error.flatten().fieldErrors,
      },
    };
  }
  try {
    return { data: parsed.data, examples: parseExamplesJson(parsed.data.examplesJson) };
  } catch {
    return {
      error: {
        status: "error",
        message: "Câu ví dụ cần có đủ tiếng Hàn và nghĩa tiếng Việt.",
        fields: { examplesJson: ["Hãy hoàn thiện hoặc xóa dòng ví dụ còn trống."] },
      },
    };
  }
}

function rpcPayload(
  data: ReturnType<typeof vocabularyFormSchema.parse>,
  examples: Array<{ korean: string; vietnamese: string }>,
) {
  return {
    p_hangul: data.hangul,
    p_romanization: data.romanization,
    p_primary_meaning_vi: data.primaryMeaningVi,
    p_part_of_speech: data.partOfSpeech,
    p_level: data.level,
    p_category: data.category,
    p_audio_url: data.audioUrl,
    p_image_url: data.imageUrl,
    p_accepted_vi: parseAnswerLines(data.acceptedVi),
    p_accepted_ko: parseAnswerLines(data.acceptedKo),
    p_examples: examples,
  };
}

export async function createVocabularyDraft(
  _state: VocabularyFormState,
  formData: FormData,
): Promise<VocabularyFormState> {
  await requirePermission("content:create");
  const parsed = parseForm(formData);
  if (parsed.error || !parsed.data || !parsed.examples) return parsed.error!;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "create_vocabulary_draft",
    rpcPayload(parsed.data, parsed.examples),
  );
  if (error || typeof data !== "string") {
    const friendly = toUserFacingError(
      error ?? new Error("create_vocabulary_draft returned no id"),
      "Chưa thể tạo từ vựng.",
    );
    return {
      status: "error",
      message:
        friendly.code === "DUPLICATE"
          ? "Từ này có thể đã tồn tại. Hãy tìm trong thư viện trước."
          : friendly.message,
    };
  }
  revalidatePath("/bien-tap/tu-vung");
  redirect(`/bien-tap/tu-vung/${data}?created=1`);
}

export async function updateVocabularyDraft(
  _state: VocabularyFormState,
  formData: FormData,
): Promise<VocabularyFormState> {
  await requirePermission("content:edit");
  const parsed = parseForm(formData);
  if (parsed.error || !parsed.data || !parsed.examples) return parsed.error!;
  if (!parsed.data.vocabularyId) {
    return { status: "error", message: "Không tìm thấy từ vựng cần sửa." };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_vocabulary_draft", {
    p_vocabulary_id: parsed.data.vocabularyId,
    ...rpcPayload(parsed.data, parsed.examples),
  });
  if (error) {
    const friendly = toUserFacingError(error, "Chưa thể lưu thay đổi.");
    return {
      status: "error",
      message:
        friendly.code === "DUPLICATE"
          ? "Nội dung này trùng với một từ đã tồn tại."
          : friendly.message,
    };
  }
  revalidatePath("/bien-tap/tu-vung");
  redirect(`/bien-tap/tu-vung/${parsed.data.vocabularyId}?updated=1`);
}

export async function setLessonVocabulary(formData: FormData) {
  await requirePermission("content:edit");
  const revisionId = formData.get("revisionId");
  const vocabularyIds = formData
    .getAll("vocabularyIds")
    .filter((value): value is string => typeof value === "string");
  if (typeof revisionId !== "string" || !revisionId) {
    redirect("/bien-tap/noi-dung?attach=invalid");
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_lesson_revision_vocabulary", {
    p_revision_id: revisionId,
    p_vocabulary_ids: vocabularyIds,
  });
  if (error) {
    const friendly = toUserFacingError(error, "Chưa thể lưu bộ từ.");
    redirect(
      `/bien-tap/noi-dung/${revisionId}/tu-vung?attach=${encodeURIComponent(friendly.message)}`,
    );
  }
  revalidatePath(`/bien-tap/noi-dung/${revisionId}`);
  redirect(`/bien-tap/noi-dung/${revisionId}?vocabulary=updated`);
}

export async function deleteVocabularyDraft(formData: FormData) {
  await requirePermission("content:delete-own");
  const vocabularyId = formData.get("vocabularyId");
  if (typeof vocabularyId !== "string" || !vocabularyId) {
    redirect("/bien-tap/tu-vung?delete=invalid");
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_vocabulary_draft", {
    p_vocabulary_id: vocabularyId,
  });
  if (error) {
    const friendly = toUserFacingError(error, "Chưa thể xóa từ vựng.");
    redirect(
      `/bien-tap/tu-vung/${vocabularyId}?delete=error&errorMessage=${encodeURIComponent(friendly.message)}`,
    );
  }
  revalidatePath("/bien-tap/tu-vung");
  redirect("/bien-tap/tu-vung?delete=done");
}

const vocabularyIdsSchema = z
  .array(z.string().trim().min(1).max(240))
  .min(1)
  .max(500)
  .transform((ids) => [...new Set(ids)]);

export async function deleteVocabularyDrafts(formData: FormData) {
  await requirePermission("content:delete-own");
  const rawIds = formData.get("vocabularyIdsJson");
  let parsedJson: unknown;

  try {
    parsedJson = typeof rawIds === "string" ? JSON.parse(rawIds) : null;
  } catch {
    parsedJson = null;
  }

  const parsedIds = vocabularyIdsSchema.safeParse(parsedJson);
  if (!parsedIds.success) {
    redirect(
      "/bien-tap/tu-vung?delete=error&errorMessage=" +
        encodeURIComponent("Hãy chọn ít nhất một từ cần xóa."),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_vocabulary_drafts", {
    p_vocabulary_ids: parsedIds.data,
  });
  if (error) {
    const friendly = toUserFacingError(error, "Chưa thể xóa các từ đã chọn.");
    redirect(
      "/bien-tap/tu-vung?delete=error&errorMessage=" +
        encodeURIComponent(friendly.message),
    );
  }

  revalidatePath("/bien-tap/tu-vung");
  redirect(`/bien-tap/tu-vung?delete=done&count=${parsedIds.data.length}`);
}
