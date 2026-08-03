"use client";

import {
  ExerciseFileImport,
  splitImportedAnswers,
} from "@/features/admin/exercise-file-import";

export type GrammarPointDraft = {
  title: string;
  form: string;
  explanation: string;
  formula: string;
  examples: Array<{
    korean: string;
    vietnamese: string;
    audioUrl?: string;
  }>;
};

const requiredHeaders = [
  "title",
  "form",
  "formula",
  "explanation",
  "example_korean",
  "example_vietnamese",
];

const sampleCsv = [
  requiredHeaders.concat("example_audio_url").join(","),
  '"Tiểu từ chủ đề","은/는","Danh từ + 은/는","Dùng để nêu chủ đề của câu.","저는 학생이에요. | 오늘은 월요일이에요.","Tôi là học sinh. | Hôm nay là thứ Hai."," | "',
].join("\n");

function required(row: Record<string, string>, key: string, rowNumber: number) {
  const value = row[key]?.trim();
  if (!value) throw new Error(`Dòng ${rowNumber}: cột ${key} không được để trống.`);
  return value;
}

export function GrammarPointFileImport({
  onImport,
}: {
  onImport: (items: GrammarPointDraft[]) => void;
}) {
  return (
    <ExerciseFileImport
      label="Nhập CSV/XLSX"
      sampleFileName="grammar-points-import-template.csv"
      sampleCsv={sampleCsv}
      requiredHeaders={requiredHeaders}
      accent="violet"
      itemLabel="điểm ngữ pháp"
      parseRow={(row, rowNumber) => {
        const koreanExamples = splitImportedAnswers(
          required(row, "example_korean", rowNumber),
        );
        const vietnameseExamples = splitImportedAnswers(
          required(row, "example_vietnamese", rowNumber),
        );
        const audioUrls = splitImportedAnswers(row.example_audio_url ?? "");

        if (koreanExamples.length !== vietnameseExamples.length) {
          throw new Error(
            `Dòng ${rowNumber}: số ví dụ tiếng Hàn và tiếng Việt phải bằng nhau.`,
          );
        }
        if (audioUrls.length > koreanExamples.length) {
          throw new Error(`Dòng ${rowNumber}: số audio URL nhiều hơn số ví dụ.`);
        }

        return {
          title: required(row, "title", rowNumber),
          form: required(row, "form", rowNumber),
          formula: required(row, "formula", rowNumber),
          explanation: required(row, "explanation", rowNumber),
          examples: koreanExamples.map((korean, index) => ({
            korean,
            vietnamese: vietnameseExamples[index],
            audioUrl: audioUrls[index] ?? "",
          })),
        };
      }}
      onImport={onImport}
    />
  );
}
