"use client";

import { ChangeEvent, useRef, useState } from "react";
import { readSheet } from "read-excel-file/browser";

type Cell = string | number | boolean | Date | null;

type ExerciseFileImportProps<T> = {
  label: string;
  sampleFileName: string;
  sampleCsv: string;
  requiredHeaders: string[];
  parseRow: (row: Record<string, string>, rowNumber: number) => T;
  onImport: (items: T[]) => void;
  accent: "sky" | "emerald" | "violet";
  itemLabel?: string;
  maxItems?: number;
};

function parseCsv(text: string) {
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

function cellText(value: Cell | undefined) {
  if (value instanceof Date) return value.toISOString();
  return value == null ? "" : String(value).trim();
}

export function splitImportedAnswers(value: string) {
  return value
    .split("|")
    .map((answer) => answer.trim())
    .filter(Boolean);
}

export function ExerciseFileImport<T>({
  label,
  sampleFileName,
  sampleCsv,
  requiredHeaders,
  parseRow,
  onImport,
  accent,
  itemLabel = "câu",
  maxItems = 15,
}: ExerciseFileImportProps<T>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const colors = accent === "sky"
    ? "border-sky-200 text-sky-800 hover:bg-sky-100"
    : accent === "violet"
      ? "border-violet-200 text-violet-800 hover:bg-violet-100"
      : "border-emerald-200 text-emerald-800 hover:bg-emerald-100";

  function downloadSample() {
    const blob = new Blob([`\uFEFF${sampleCsv}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = sampleFileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const extension = file.name.split(".").pop()?.toLowerCase();
      if (extension !== "csv" && extension !== "xlsx") {
        throw new Error("Chỉ hỗ trợ tệp CSV hoặc XLSX.");
      }
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("Tệp vượt quá giới hạn 5 MB.");
      }
      const matrix = extension === "csv"
        ? parseCsv(await file.text())
        : ((await readSheet(file)) as Cell[][]);
      if (matrix.length < 2) throw new Error("Tệp chưa có dòng nội dung nào.");
      const headers = matrix[0].map((cell) =>
        cellText(cell).replace(/^\uFEFF/, "").toLowerCase(),
      );
      const missing = requiredHeaders.filter((header) => !headers.includes(header));
      if (missing.length) throw new Error(`Thiếu cột: ${missing.join(", ")}.`);
      const items = matrix
        .slice(1)
        .filter((row) => row.some((cell) => cellText(cell)))
        .map((row, index) => {
          const record = Object.fromEntries(
            headers.map((header, cellIndex) => [header, cellText(row[cellIndex])]),
          );
          return parseRow(record, index + 2);
        });
      if (!items.length) throw new Error("Tệp chưa có dòng nội dung nào.");
      if (items.length > maxItems) {
        throw new Error(`Mỗi bài chỉ được nhập tối đa ${maxItems} ${itemLabel}.`);
      }
      onImport(items);
      setMessage(
        `Đã nhập ${items.length} ${itemLabel}. Danh sách cũ đã được thay thế.`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể đọc tệp.");
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-white/80 bg-white/70 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx"
          onChange={(event) => void importFile(event)}
          className="sr-only"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={`rounded-xl border bg-white px-4 py-2.5 text-sm font-black transition ${colors}`}
        >
          ↑ {label}
        </button>
        <button
          type="button"
          onClick={downloadSample}
          className={`rounded-xl border bg-white px-4 py-2.5 text-sm font-black transition ${colors}`}
        >
          ↓ Tải CSV mẫu
        </button>
      </div>
      <p className="mt-2 text-xs font-semibold text-ink-500">
        Import sẽ thay thế danh sách hiện tại · tối đa {maxItems} {itemLabel} · tối đa 5 MB.
      </p>
      {message && (
        <p aria-live="polite" className="mt-3 rounded-xl bg-white px-3 py-2 text-sm font-bold text-ink-700">
          {message}
        </p>
      )}
    </div>
  );
}
