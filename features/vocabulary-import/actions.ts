"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/authorize";
import { toUserFacingError } from "@/lib/errors/user-facing";
import { createClient } from "@/lib/supabase/server";
import {
  parseVocabularyImport,
  vocabularyNaturalKey,
  type NormalizedImportData,
} from "@/lib/vocabulary-import/parser";

export type VocabularyImportState = {
  status: "idle" | "error";
  message?: string;
};

type ImportCommitError = {
  code?: string;
  message: string;
};

function isNaturalKeyConflict(error: ImportCommitError | null) {
  return (
    error?.code === "23505" &&
    error.message.toLowerCase().includes("duplicate vocabulary natural key")
  );
}

async function commitWithLegacyDatabase(
  supabase: Awaited<ReturnType<typeof createClient>>,
  importId: string,
): Promise<{ error: ImportCommitError | null }> {
  const { data: rows, error: rowsError } = await supabase
    .from("content_import_rows")
    .select("id,row_status,normalized_data")
    .eq("import_id", importId)
    .in("row_status", ["valid", "duplicate"])
    .order("row_number")
    .range(0, 4_999);

  if (rowsError) return { error: rowsError };

  for (const row of rows ?? []) {
    if (row.row_status === "duplicate") {
      const { error } = await supabase
        .from("content_import_rows")
        .update({ row_status: "skipped" })
        .eq("id", row.id);
      if (error) return { error };
      continue;
    }

    const vocabulary = row.normalized_data as NormalizedImportData;
    const { data: vocabularyId, error: createError } = await supabase.rpc(
      "create_vocabulary_draft",
      {
        p_hangul: vocabulary.hangul,
        p_romanization: vocabulary.romanization,
        p_primary_meaning_vi: vocabulary.meaning_vi,
        p_part_of_speech: vocabulary.part_of_speech,
        p_level: vocabulary.level,
        p_category: vocabulary.category,
        p_audio_url: vocabulary.audio_url,
        p_image_url: vocabulary.image_url,
        p_accepted_vi: vocabulary.accepted_vi,
        p_accepted_ko: vocabulary.accepted_ko,
        p_examples: vocabulary.examples,
      },
    );

    if (isNaturalKeyConflict(createError)) {
      const { error } = await supabase
        .from("content_import_rows")
        .update({
          row_status: "skipped",
          duplicate_of: `Từ “${vocabulary.hangul}” đã tồn tại trong thư viện và được tự động bỏ qua.`,
        })
        .eq("id", row.id);
      if (error) return { error };
      continue;
    }

    if (createError || typeof vocabularyId !== "string") {
      return {
        error:
          createError ?? {
            message: "create_vocabulary_draft returned no id",
          },
      };
    }

    const { error: rowUpdateError } = await supabase
      .from("content_import_rows")
      .update({
        row_status: "imported",
        imported_vocabulary_id: vocabularyId,
      })
      .eq("id", row.id);
    if (rowUpdateError) return { error: rowUpdateError };
  }

  const { data: completedRows, error: completedRowsError } = await supabase
    .from("content_import_rows")
    .select("row_status")
    .eq("import_id", importId)
    .range(0, 4_999);
  if (completedRowsError) return { error: completedRowsError };

  const importedCount = (completedRows ?? []).filter(
    (row) => row.row_status === "imported",
  ).length;
  const skippedCount = (completedRows ?? []).filter(
    (row) => row.row_status === "skipped",
  ).length;

  const { error: batchUpdateError } = await supabase
    .from("content_imports")
    .update({
      status: "completed",
      valid_rows: importedCount,
      duplicate_rows: skippedCount,
      completed_at: new Date().toISOString(),
    })
    .eq("id", importId);

  return { error: batchUpdateError };
}

export async function uploadVocabularyImport(
  _state: VocabularyImportState,
  formData: FormData,
): Promise<VocabularyImportState> {
  const actor = await requirePermission("content:create");
  const file = formData.get("file");
  if (!(file instanceof File) || !file.name) {
    return { status: "error", message: "Hãy chọn một tệp CSV hoặc XLSX." };
  }

  let parsed;
  try {
    parsed = await parseVocabularyImport(
      file.name,
      Buffer.from(await file.arrayBuffer()),
    );
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Không thể đọc tệp. Hãy kiểm tra lại định dạng.",
    };
  }

  const supabase = await createClient();
  const { data: existing, error: existingError } = await supabase
    .from("vocabulary_items")
    .select(
      "id,hangul,part_of_speech,primary_meaning_vi,status,created_by",
    )
    .range(0, 9_999);
  if (existingError)
    return {
      status: "error",
      message: toUserFacingError(
        existingError,
        "Chưa thể kiểm tra dữ liệu trùng.",
      ).message,
    };

  const existingKeys = new Map(
    (existing ?? []).map((item) => [
      vocabularyNaturalKey({
        hangul: item.hangul,
        partOfSpeech: item.part_of_speech,
        meaningVi: item.primary_meaning_vi,
      }),
      item,
    ]),
  );
  const fileKeys = new Map<string, number>();
  const stagedRows = parsed.rows.map((row) => {
    const existingItem = existingKeys.get(row.naturalKey);
    const earlierRow = fileKeys.get(row.naturalKey);
    if (!earlierRow) fileKeys.set(row.naturalKey, row.rowNumber);
    const duplicateOf = existingItem
      ? existingItem.status === "published"
        ? `Từ “${row.normalizedData.hangul}” đang được dùng trong bài học. Hệ thống sẽ bỏ qua dòng này.`
        : existingItem.created_by === actor.id
          ? `Bạn đã có bản nháp của từ “${row.normalizedData.hangul}”. Hãy sửa hoặc xóa bản nháp đó trong Thư viện từ trước khi nhập lại.`
          : `Từ “${row.normalizedData.hangul}” đã tồn tại trong thư viện. Hệ thống sẽ bỏ qua dòng này.`
      : earlierRow
        ? `Trùng với dòng ${earlierRow} trong chính tệp này. Hệ thống sẽ bỏ qua dòng này.`
        : null;
    const rowStatus =
      row.validationErrors.length > 0
        ? "invalid"
        : duplicateOf
          ? "duplicate"
          : "valid";
    return {
      import_id: "",
      row_number: row.rowNumber,
      raw_data: row.rawData,
      normalized_data: row.normalizedData,
      validation_errors: row.validationErrors,
      duplicate_of: duplicateOf,
      row_status: rowStatus,
    };
  });
  const validRows = stagedRows.filter((row) => row.row_status === "valid").length;
  const invalidRows = stagedRows.filter(
    (row) => row.row_status === "invalid",
  ).length;
  const duplicateRows = stagedRows.filter(
    (row) => row.row_status === "duplicate",
  ).length;
  const { data: batch, error: batchError } = await supabase
    .from("content_imports")
    .insert({
      file_name: file.name,
      file_type: parsed.fileType,
      status: "validating",
      total_rows: stagedRows.length,
      valid_rows: validRows,
      invalid_rows: invalidRows,
      duplicate_rows: duplicateRows,
      created_by: actor.id,
    })
    .select("id")
    .single();
  if (batchError || !batch)
    return {
      status: "error",
      message: toUserFacingError(
        batchError ?? new Error("content import id missing"),
        "Chưa thể tạo phiên nhập dữ liệu.",
      ).message,
    };

  for (let index = 0; index < stagedRows.length; index += 250) {
    const chunk = stagedRows.slice(index, index + 250).map((row) => ({
      ...row,
      import_id: batch.id,
    }));
    const { error } = await supabase.from("content_import_rows").insert(chunk);
    if (error) {
      await supabase.from("content_imports").delete().eq("id", batch.id);
      return {
        status: "error",
        message: toUserFacingError(
          error,
          "Không thể lưu dữ liệu xem trước.",
        ).message,
      };
    }
  }
  const { error: readyError } = await supabase
    .from("content_imports")
    .update({ status: invalidRows > 0 ? "needs_attention" : "ready" })
    .eq("id", batch.id);
  if (readyError)
    return {
      status: "error",
      message: toUserFacingError(
        readyError,
        "Dữ liệu đã tải lên nhưng chưa thể hoàn tất kiểm tra.",
      ).message,
    };
  redirect(`/bien-tap/nhap-tu-vung/${batch.id}`);
}

export async function commitVocabularyImport(formData: FormData) {
  await requirePermission("content:create");
  const importId = formData.get("importId");
  if (typeof importId !== "string" || !importId)
    redirect("/bien-tap/nhap-tu-vung?error=invalid");
  const supabase = await createClient();
  const { error } = await supabase.rpc("commit_vocabulary_import", {
    p_import_id: importId,
  });
  const commitError = isNaturalKeyConflict(error)
    ? (await commitWithLegacyDatabase(supabase, importId)).error
    : error;
  if (commitError) {
    const friendly = toUserFacingError(
      commitError,
      "Chưa thể hoàn tất nhập dữ liệu.",
    );
    redirect(
      `/bien-tap/nhap-tu-vung/${importId}?error=${encodeURIComponent(friendly.message)}`,
    );
  }
  revalidatePath("/bien-tap/tu-vung");
  revalidatePath(`/bien-tap/nhap-tu-vung/${importId}`);
  redirect(`/bien-tap/nhap-tu-vung/${importId}?completed=1`);
}
