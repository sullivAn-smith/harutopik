import { readSheet } from "read-excel-file/node";
import { normalizeAnswer, normalizeKorean } from "@/lib/vocabulary/domain";

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 5_000;

export const importHeaders = [
  "hangul",
  "romanization",
  "meaning_vi",
  "part_of_speech",
  "level",
  "category",
  "accepted_vi",
  "accepted_ko",
  "example_ko",
  "example_vi",
  "audio_url",
  "image_url",
] as const;

type ImportHeader = (typeof importHeaders)[number];
type Cell = string | number | boolean | Date | null;

export type NormalizedImportData = {
  hangul: string;
  normalized_hangul: string;
  romanization: string;
  meaning_vi: string;
  part_of_speech: string;
  level: string;
  category: string;
  accepted_vi: string[];
  accepted_ko: string[];
  examples: Array<{ korean: string; vietnamese: string }>;
  audio_url: string;
  image_url: string;
};

export type ParsedImportRow = {
  rowNumber: number;
  rawData: Record<string, string>;
  normalizedData: NormalizedImportData;
  validationErrors: string[];
  naturalKey: string;
};

export type ParsedVocabularyImport = {
  fileType: "csv" | "xlsx";
  rows: ParsedImportRow[];
};

function cellText(value: Cell | undefined) {
  if (value instanceof Date) return value.toISOString();
  return value == null ? "" : String(value).trim();
}

function splitAnswers(value: string) {
  return value
    .split("|")
    .map((answer) => answer.trim())
    .filter(Boolean);
}

function uniqueAnswers(values: string[], normalizer: (value: string) => string) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = normalizer(value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isValidOptionalUrl(value: string) {
  if (!value) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function vocabularyNaturalKey(input: {
  hangul: string;
  partOfSpeech?: string | null;
  meaningVi: string;
}) {
  return [
    normalizeKorean(input.hangul),
    (input.partOfSpeech ?? "").trim().toLocaleLowerCase("vi"),
    normalizeAnswer(input.meaningVi),
  ].join("|");
}

function normalizeRow(
  values: Cell[],
  headerIndexes: Map<ImportHeader, number>,
  rowNumber: number,
): ParsedImportRow | null {
  const rawData = Object.fromEntries(
    importHeaders.map((header) => [
      header,
      cellText(values[headerIndexes.get(header) ?? -1]),
    ]),
  ) as Record<ImportHeader, string>;
  if (Object.values(rawData).every((value) => !value)) return null;

  const hangul = normalizeKorean(rawData.hangul);
  const meaningVi = rawData.meaning_vi.normalize("NFC").trim();
  const acceptedVi = uniqueAnswers(
    [meaningVi, ...splitAnswers(rawData.accepted_vi)],
    normalizeAnswer,
  );
  const acceptedKo = uniqueAnswers(
    [hangul, ...splitAnswers(rawData.accepted_ko)],
    normalizeKorean,
  );
  const validationErrors: string[] = [];
  if (!hangul) validationErrors.push("Thiếu từ tiếng Hàn (hangul).");
  if (!meaningVi) validationErrors.push("Thiếu nghĩa tiếng Việt (meaning_vi).");
  if (hangul.length > 200) validationErrors.push("Hangul vượt quá 200 ký tự.");
  if (meaningVi.length > 500)
    validationErrors.push("Nghĩa tiếng Việt vượt quá 500 ký tự.");
  if (!!rawData.example_ko !== !!rawData.example_vi)
    validationErrors.push("Câu ví dụ phải có đủ tiếng Hàn và tiếng Việt.");
  if (!isValidOptionalUrl(rawData.audio_url))
    validationErrors.push("audio_url phải là URL http/https hợp lệ.");
  if (!isValidOptionalUrl(rawData.image_url))
    validationErrors.push("image_url phải là URL http/https hợp lệ.");

  const normalizedData: NormalizedImportData = {
    hangul,
    normalized_hangul: hangul,
    romanization: rawData.romanization,
    meaning_vi: meaningVi,
    part_of_speech: rawData.part_of_speech,
    level: rawData.level || "beginner",
    category: rawData.category || "general",
    accepted_vi: acceptedVi,
    accepted_ko: acceptedKo,
    examples:
      rawData.example_ko && rawData.example_vi
        ? [{ korean: rawData.example_ko, vietnamese: rawData.example_vi }]
        : [],
    audio_url: rawData.audio_url,
    image_url: rawData.image_url,
  };
  return {
    rowNumber,
    rawData,
    normalizedData,
    validationErrors,
    naturalKey: vocabularyNaturalKey({
      hangul,
      partOfSpeech: rawData.part_of_speech,
      meaningVi,
    }),
  };
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else value += character;
    } else if (character === '"') quoted = true;
    else if (character === ",") {
      row.push(value);
      value = "";
    } else if (character === "\n") {
      row.push(value.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      value = "";
    } else value += character;
  }
  if (value || row.length) {
    row.push(value.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows;
}

export function normalizeImportMatrix(matrix: Cell[][]): ParsedImportRow[] {
  if (matrix.length === 0) throw new Error("Tệp không có dữ liệu.");
  const header = matrix[0].map((value) =>
    cellText(value).replace(/^\uFEFF/, "").toLowerCase(),
  );
  const headerIndexes = new Map<ImportHeader, number>();
  for (const requiredHeader of importHeaders) {
    const index = header.indexOf(requiredHeader);
    if (index >= 0) headerIndexes.set(requiredHeader, index);
  }
  for (const required of ["hangul", "meaning_vi"] satisfies ImportHeader[]) {
    if (!headerIndexes.has(required))
      throw new Error(`Tệp thiếu cột bắt buộc "${required}".`);
  }
  if (matrix.length - 1 > MAX_IMPORT_ROWS)
    throw new Error(`Mỗi lần chỉ nhập tối đa ${MAX_IMPORT_ROWS} dòng.`);
  return matrix
    .slice(1)
    .map((values, index) => normalizeRow(values, headerIndexes, index + 2))
    .filter((row): row is ParsedImportRow => row !== null);
}

export async function parseVocabularyImport(
  fileName: string,
  bytes: Buffer,
): Promise<ParsedVocabularyImport> {
  if (bytes.byteLength === 0) throw new Error("Tệp đang trống.");
  if (bytes.byteLength > MAX_IMPORT_BYTES)
    throw new Error("Tệp vượt quá giới hạn 5 MB.");
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (extension !== "csv" && extension !== "xlsx")
    throw new Error("Chỉ hỗ trợ tệp CSV hoặc XLSX.");
  const matrix =
    extension === "csv"
      ? parseCsv(bytes.toString("utf8"))
      : ((await readSheet(bytes)) as Cell[][]);
  const rows = normalizeImportMatrix(matrix);
  if (rows.length === 0) throw new Error("Tệp không có dòng từ vựng nào.");
  return { fileType: extension, rows };
}
