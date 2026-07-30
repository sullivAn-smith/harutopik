"use client";

import { useRef, useState } from "react";
import { readSheet } from "read-excel-file/browser";

export type GrammarExerciseDraft = {
  prompt: string;
  translation: string;
  acceptedAnswers: string[];
};

const headerAliases = {
  prompt: ["prompt", "cau_tieng_han", "câu tiếng hàn", "cau_hoi"],
  translation: ["translation", "nghia_tieng_viet", "nghĩa tiếng việt", "goi_y"],
  answer: ["answer", "dap_an", "đáp án", "accepted_answers"],
};

function normalizeHeader(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function findColumn(headers: unknown[], aliases: string[]) {
  return headers.findIndex((header) =>
    aliases.includes(normalizeHeader(header)),
  );
}

function rowsToExercises(rows: unknown[][]): GrammarExerciseDraft[] {
  if (rows.length < 2) throw new Error("File chưa có dòng dữ liệu.");
  const [headers, ...dataRows] = rows;
  const promptIndex = findColumn(headers, headerAliases.prompt);
  const translationIndex = findColumn(headers, headerAliases.translation);
  const answerIndex = findColumn(headers, headerAliases.answer);
  if ([promptIndex, translationIndex, answerIndex].includes(-1)) {
    throw new Error(
      "Thiếu cột prompt, translation hoặc answer. Hãy dùng đúng file mẫu.",
    );
  }

  return dataRows
    .filter((row) => row.some((cell) => String(cell ?? "").trim()))
    .map((row, index) => {
      const prompt = String(row[promptIndex] ?? "").trim();
      const translation = String(row[translationIndex] ?? "").trim();
      const acceptedAnswers = String(row[answerIndex] ?? "")
        .split(/[|;]/)
        .map((answer) => answer.trim())
        .filter(Boolean);
      if (!prompt || !translation || acceptedAnswers.length === 0) {
        throw new Error(
          `Dòng ${index + 2} cần đủ câu tiếng Hàn, nghĩa tiếng Việt và đáp án.`,
        );
      }
      return { prompt, translation, acceptedAnswers };
    });
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      cells.push(cell);
      cell = "";
    } else {
      cell += character;
    }
  }
  cells.push(cell);
  return cells;
}

export function GrammarExerciseImport({
  exercises,
  onChange,
}: {
  exercises: GrammarExerciseDraft[];
  onChange: (items: GrammarExerciseDraft[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");

  async function importFile(file?: File) {
    if (!file) return;
    setMessage("");
    try {
      const extension = file.name.split(".").pop()?.toLowerCase();
      const rows =
        extension === "xlsx"
          ? ((await readSheet(file)) as unknown[][])
          : file
              .text()
              .then((text) =>
                text
                  .replace(/^\uFEFF/, "")
                  .split(/\r?\n/)
                  .filter(Boolean)
                  .map(parseCsvLine),
              );
      const imported = rowsToExercises(await rows);
      onChange(imported);
      setMessage(`Đã nhập ${imported.length} câu. Hãy kiểm tra rồi lưu bài.`);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Không thể đọc file đã chọn.",
      );
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black">Luyện tập điền ngữ pháp</h2>
          <p className="mt-2 max-w-2xl leading-7 text-ink-600">
            Nhập một file CSV/XLSX để tạo nhanh toàn bộ câu luyện tập. File mới
            sẽ thay thế danh sách câu hiện tại sau khi bạn bấm lưu bài.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/templates/grammar-exercise-import-template.csv"
            download
            className="rounded-xl border-2 border-emerald-700 bg-white px-4 py-2 font-black text-emerald-800"
          >
            ↓ Tải file mẫu
          </a>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-xl bg-emerald-700 px-4 py-2 font-black text-white"
          >
            ↑ Nhập CSV/XLSX
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx"
            className="sr-only"
            onChange={(event) => void importFile(event.target.files?.[0])}
          />
        </div>
      </div>

      {message && (
        <p
          role="status"
          className={`mt-4 rounded-xl px-4 py-3 font-bold ${
            message.startsWith("Đã nhập")
              ? "bg-white text-emerald-800"
              : "bg-red-50 text-red-700"
          }`}
        >
          {message}
        </p>
      )}

      <div className="mt-4 space-y-3">
        {exercises.length === 0 ? (
          <p className="rounded-xl bg-white p-4 font-semibold text-ink-600">
            Chưa có câu luyện tập.
          </p>
        ) : (
          exercises.map((exercise, index) => (
            <article
              key={`${exercise.prompt}-${index}`}
              className="rounded-2xl border border-emerald-100 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black">
                    Câu {index + 1}: {exercise.translation}
                  </p>
                  <p lang="ko" className="mt-1 text-lg font-bold">
                    {exercise.prompt}
                  </p>
                  <p className="mt-1 text-sm text-ink-600">
                    Đáp án: {exercise.acceptedAnswers.join(" · ")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onChange(
                      exercises.filter(
                        (_, exerciseIndex) => exerciseIndex !== index,
                      ),
                    )
                  }
                  className="font-black text-red-700"
                >
                  Xóa
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
