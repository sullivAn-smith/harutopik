import "server-only";

import { requirePermission } from "@/lib/auth/authorize";
import { createClient } from "@/lib/supabase/server";

export type VocabularyImportRow = {
  id: number;
  rowNumber: number;
  rawData: Record<string, string>;
  normalizedData: {
    hangul?: string;
    meaning_vi?: string;
    romanization?: string;
    category?: string;
  };
  validationErrors: string[];
  duplicateOf: string | null;
  rowStatus: string;
  importedVocabularyId: string | null;
};

export async function getVocabularyImport(importId: string) {
  await requirePermission("content:read-draft");
  const supabase = await createClient();
  const [{ data: batch, error: batchError }, { data: rows, error: rowsError }] =
    await Promise.all([
      supabase
        .from("content_imports")
        .select(
          "id,file_name,file_type,status,total_rows,valid_rows,invalid_rows,duplicate_rows,created_at,completed_at",
        )
        .eq("id", importId)
        .maybeSingle(),
      supabase
        .from("content_import_rows")
        .select(
          "id,row_number,raw_data,normalized_data,validation_errors,duplicate_of,row_status,imported_vocabulary_id",
        )
        .eq("import_id", importId)
        .order("row_number"),
    ]);
  if (batchError || rowsError || !batch) return null;
  return {
    batch: {
      id: batch.id,
      fileName: batch.file_name,
      fileType: batch.file_type,
      status: batch.status,
      totalRows: batch.total_rows,
      validRows: batch.valid_rows,
      invalidRows: batch.invalid_rows,
      duplicateRows: batch.duplicate_rows,
      createdAt: batch.created_at,
      completedAt: batch.completed_at,
    },
    rows: (rows ?? []).map((row) => ({
      id: row.id,
      rowNumber: row.row_number,
      rawData: row.raw_data as Record<string, string>,
      normalizedData: row.normalized_data as VocabularyImportRow["normalizedData"],
      validationErrors: row.validation_errors,
      duplicateOf: row.duplicate_of,
      rowStatus: row.row_status,
      importedVocabularyId: row.imported_vocabulary_id,
    })) satisfies VocabularyImportRow[],
  };
}
