"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/authorize";
import { toUserFacingError } from "@/lib/errors/user-facing";
import { normalizeKorean } from "@/lib/vocabulary/domain";
import { createAdminClient } from "@/lib/supabase/admin";

const imageUrlSchema = z.union([
  z.literal(""),
  z.string().url("URL ảnh chưa đúng định dạng."),
  z
    .string()
    .regex(
      /^\/(?!\/)[^\s]+$/,
      "Đường dẫn ảnh nội bộ chưa đúng định dạng.",
    ),
]);

const schema = z.object({
  contentId: z.string().min(1),
  vocabularyId: z.string().min(1),
  hangul: z
    .string()
    .trim()
    .min(1, "Không được để trống.")
    .max(200, "Tối đa 200 ký tự."),
  meaningVi: z
    .string()
    .trim()
    .min(1, "Không được để trống.")
    .max(500, "Tối đa 500 ký tự."),
  romanization: z.string().trim().max(300, "Tối đa 300 ký tự."),
  partOfSpeech: z.string().trim().max(100, "Tối đa 100 ký tự."),
  level: z
    .string()
    .trim()
    .min(1, "Hãy chọn một trình độ.")
    .max(100, "Tối đa 100 ký tự."),
  category: z
    .string()
    .trim()
    .min(1, "Không được để trống.")
    .max(120, "Tối đa 120 ký tự."),
  acceptedVi: z.string(),
  acceptedKo: z.string(),
  imageUrl: imageUrlSchema,
  examplesJson: z.string(),
  reason: z
    .string()
    .trim()
    .min(5, "Hãy nhập ít nhất 5 ký tự.")
    .max(500, "Tối đa 500 ký tự."),
});

const examplesSchema = z.array(
  z.object({
    id: z.string().min(1).max(240),
    korean: z
      .string()
      .trim()
      .min(1, "Thiếu câu tiếng Hàn.")
      .max(500, "Câu tiếng Hàn quá dài."),
    vietnamese: z
      .string()
      .trim()
      .min(1, "Thiếu nghĩa tiếng Việt.")
      .max(1_000, "Nghĩa tiếng Việt quá dài."),
    audioUrl: z
      .string()
      .url("URL audio chưa đúng định dạng.")
      .nullable()
      .optional(),
    position: z.number().int().positive(),
  }),
);

export type VocabularyHotfixState = {
  status: "idle" | "error";
  message?: string;
  fields?: Record<string, string[]>;
};

const fieldLabels: Record<string, string> = {
  hangul: "Tiếng Hàn",
  meaningVi: "Nghĩa tiếng Việt",
  romanization: "Phiên âm",
  partOfSpeech: "Từ loại",
  level: "Trình độ",
  category: "Chủ đề",
  acceptedVi: "Đáp án tiếng Việt",
  acceptedKo: "Đáp án tiếng Hàn",
  imageUrl: "Ảnh minh họa",
  reason: "Lý do chỉnh sửa",
};

function parseAnswerLines(value: string) {
  return [
    ...new Set(
      value
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

function buildAcceptedAnswers({
  vocabularyId,
  hangul,
  meaningVi,
  acceptedVi,
  acceptedKo,
}: {
  vocabularyId: string;
  hangul: string;
  meaningVi: string;
  acceptedVi: string;
  acceptedKo: string;
}) {
  const viAnswers = [...new Set([...parseAnswerLines(acceptedVi), meaningVi])];
  const koAnswers = [...new Set([...parseAnswerLines(acceptedKo), hangul])];
  return [
    ...viAnswers.map((answer) => ({
      vocabulary_id: vocabularyId,
      direction: "ko_vi",
      answer,
      normalized_answer: answer.trim().toLocaleLowerCase("vi"),
    })),
    ...koAnswers.map((answer) => ({
      vocabulary_id: vocabularyId,
      direction: "vi_ko",
      answer,
      normalized_answer: normalizeKorean(answer),
    })),
  ];
}

export async function applyVocabularyHotfix(
  _state: VocabularyHotfixState,
  formData: FormData,
): Promise<VocabularyHotfixState> {
  const actor = await requirePermission("content:publish");
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const fields = parsed.error.flatten().fieldErrors;
    const firstError = Object.entries(fields).find(
      ([, messages]) => messages?.[0],
    );
    return {
      status: "error",
      message: firstError
        ? `${fieldLabels[firstError[0]] ?? firstError[0]}: ${firstError[1]?.[0]}`
        : "Có trường chưa đúng. Hãy kiểm tra phần được đánh dấu.",
      fields,
    };
  }
  let examples;
  try {
    examples = examplesSchema.parse(
      JSON.parse(parsed.data.examplesJson || "[]"),
    );
  } catch (error) {
    const issue =
      error instanceof z.ZodError ? error.issues[0] : undefined;
    const row =
      typeof issue?.path[0] === "number" ? Number(issue.path[0]) + 1 : null;
    return {
      status: "error",
      message: row
        ? `Câu ví dụ ${row}: ${issue?.message ?? "Dữ liệu chưa đúng."}`
        : "Câu ví dụ: Dữ liệu chưa đúng. Hãy kiểm tra lại.",
    };
  }
  const admin = createAdminClient();
  const { data: relation, error: relationError } = await admin
    .from("lesson_vocabulary")
    .select("lesson_id")
    .eq("lesson_id", parsed.data.contentId)
    .eq("vocabulary_id", parsed.data.vocabularyId)
    .maybeSingle();
  if (relationError) {
    return {
      status: "error",
      message: "Không kiểm tra được bài học. Hãy tải lại trang và thử lại.",
    };
  }
  if (!relation) {
    return {
      status: "error",
      message: "Từ này không còn thuộc bài học. Hãy quay lại danh sách hotfix.",
    };
  }
  const { data: current, error: currentError } = await admin
    .from("vocabulary_items")
    .select("hangul,primary_meaning_vi,romanization,part_of_speech,level,category,image_url,audio_url")
    .eq("id", parsed.data.vocabularyId)
    .maybeSingle();
  if (currentError) {
    return {
      status: "error",
      message: "Không tải được dữ liệu từ vựng. Hãy thử lại.",
    };
  }
  if (!current) {
    return {
      status: "error",
      message: "Từ vựng không còn tồn tại. Hãy quay lại danh sách hotfix.",
    };
  }

  const hangulChanged =
    normalizeKorean(current.hangul) !== normalizeKorean(parsed.data.hangul);
  const { error } = await admin
    .from("vocabulary_items")
    .update({
      hangul: parsed.data.hangul,
      normalized_hangul: normalizeKorean(parsed.data.hangul),
      primary_meaning_vi: parsed.data.meaningVi,
      romanization: parsed.data.romanization,
      part_of_speech: parsed.data.partOfSpeech || null,
      level: parsed.data.level,
      category: parsed.data.category,
      image_url: parsed.data.imageUrl || null,
      ...(hangulChanged ? { audio_url: null } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.vocabularyId);
  if (error) {
    const friendly = toUserFacingError(
      error,
      "Không lưu được thay đổi. Hãy thử lại.",
    );
    return {
      status: "error",
      message:
        friendly.code === "DUPLICATE"
          ? "Tiếng Hàn này trùng với một từ đã có. Hãy kiểm tra thư viện từ."
          : friendly.message,
    };
  }
  const acceptedAnswers = buildAcceptedAnswers({
    vocabularyId: parsed.data.vocabularyId,
    hangul: parsed.data.hangul,
    meaningVi: parsed.data.meaningVi,
    acceptedVi: parsed.data.acceptedVi,
    acceptedKo: parsed.data.acceptedKo,
  });
  const { error: deleteAnswersError } = await admin
    .from("vocabulary_accepted_answers")
    .delete()
    .eq("vocabulary_id", parsed.data.vocabularyId);
  if (deleteAnswersError) {
    return {
      status: "error",
      message:
        "Thông tin từ đã lưu, nhưng đáp án luyện tập chưa cập nhật được. Hãy thử lại.",
    };
  }
  const { error: insertAnswersError } = await admin
    .from("vocabulary_accepted_answers")
    .insert(acceptedAnswers);
  if (insertAnswersError) {
    return {
      status: "error",
      message:
        "Thông tin từ đã lưu, nhưng đáp án luyện tập chưa cập nhật được. Hãy thử lại.",
    };
  }
  const exampleResults = await Promise.all(
    examples.map((example) =>
      admin
        .from("vocabulary_examples")
        .update({
          korean: example.korean,
          vietnamese: example.vietnamese,
          audio_url: example.audioUrl ?? null,
          position: example.position,
        })
        .eq("id", example.id)
        .eq("vocabulary_id", parsed.data.vocabularyId),
    ),
  );
  if (exampleResults.some((result) => result.error)) {
    return {
      status: "error",
      message:
        "Thông tin từ đã lưu, nhưng câu ví dụ chưa lưu được. Hãy tải lại và thử lại.",
    };
  }

  await admin.from("audit_logs").insert({
    actor_id: actor.id,
    action: "vocabulary.hotfix.applied",
    entity_type: "vocabulary",
    entity_id: parsed.data.vocabularyId,
    metadata: {
      lesson_id: parsed.data.contentId,
      reason: parsed.data.reason,
      before: current,
      audio_cleared: hangulChanged,
      example_audio_count: examples.filter((example) => example.audioUrl).length,
    },
  });
  revalidatePath(`/quan-tri/hotfix/${parsed.data.contentId}`);
  revalidatePath("/courses", "layout");
  redirect(
    `/quan-tri/hotfix/${parsed.data.contentId}/tu-vung/${parsed.data.vocabularyId}?saved=1`,
  );
}
