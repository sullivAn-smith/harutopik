"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/authorize";
import { createClient } from "@/lib/supabase/server";
import {
  parseVocabularyImport,
  vocabularyNaturalKey,
} from "@/lib/vocabulary-import/parser";

export type VocabularyImportState = {
  status: "idle" | "error";
  message?: string;
};

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
    .select("id,hangul,part_of_speech,primary_meaning_vi")
    .range(0, 9_999);
  if (existingError)
    return {
      status: "error",
      message: "Chưa thể kiểm tra dữ liệu trùng. Vui lòng thử lại.",
    };

  const existingKeys = new Map(
    (existing ?? []).map((item) => [
      vocabularyNaturalKey({
        hangul: item.hangul,
        partOfSpeech: item.part_of_speech,
        meaningVi: item.primary_meaning_vi,
      }),
      item.id,
    ]),
  );
  const fileKeys = new Map<string, number>();
  const stagedRows = parsed.rows.map((row) => {
    const existingId = existingKeys.get(row.naturalKey);
    const earlierRow = fileKeys.get(row.naturalKey);
    if (!earlierRow) fileKeys.set(row.naturalKey, row.rowNumber);
    const duplicateOf = existingId
      ? `Từ đã có trong thư viện: ${existingId}`
      : earlierRow
        ? `Trùng dòng ${earlierRow} trong tệp`
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
    return { status: "error", message: "Chưa thể tạo phiên nhập dữ liệu." };

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
        message: "Không thể lưu dữ liệu xem trước. Vui lòng tải lại tệp.",
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
      message: "Dữ liệu đã tải lên nhưng chưa thể hoàn tất kiểm tra.",
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
  if (error)
    redirect(`/bien-tap/nhap-tu-vung/${importId}?error=commit`);
  revalidatePath("/bien-tap/tu-vung");
  revalidatePath(`/bien-tap/nhap-tu-vung/${importId}`);
  redirect(`/bien-tap/nhap-tu-vung/${importId}?completed=1`);
}
