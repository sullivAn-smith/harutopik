import { describe, expect, it } from "vitest";
import { buildExamSkeleton } from "@/lib/exams/exam-template";
import { parseExamImportRows } from "./exam-import";
import {
  buildExamImportRows,
  getExamImportPermission,
  mergeExamImportQuestions,
} from "./exam-import-template";

describe("exam import template", () => {
  it("xuất đủ 70 câu TOPIK I và 100 câu TOPIK II", () => {
    const topikI = buildExamSkeleton("topik_i");
    const topikII = buildExamSkeleton("topik_ii");

    expect(buildExamImportRows("topik_i", topikI)).toHaveLength(71);
    expect(buildExamImportRows("topik_ii", topikII)).toHaveLength(101);
    expect(buildExamImportRows("topik_i", topikI, "listening")).toHaveLength(31);
    expect(buildExamImportRows("topik_i", topikI, "reading")).toHaveLength(41);
    expect(buildExamImportRows("topik_ii", topikII, "listening")).toHaveLength(51);
    expect(buildExamImportRows("topik_ii", topikII, "reading")).toHaveLength(51);

    const header = buildExamImportRows("topik_i", topikI, "listening")[0];
    expect(header).not.toContain("audio_url");
    expect(header).not.toContain("image_url");
    expect(header).not.toContain("option_image_1");

    const topikIReading = buildExamImportRows("topik_i", topikI, "reading");
    expect(topikIReading[1][1]).toBe("31");
    expect(topikIReading.at(-1)?.[1]).toBe("70");
  });

  it("nhập số câu đọc TOPIK I từ 31–70 vào đúng vị trí nội bộ 1–40", () => {
    const questions = buildExamSkeleton("topik_i");
    const rows = buildExamImportRows("topik_i", questions, "reading");
    const header = rows[0];
    const optionIndex = header.indexOf("option_1");
    rows[1][optionIndex] = "답안 câu 31";
    rows.at(-1)![optionIndex] = "답안 câu 70";

    const merged = mergeExamImportQuestions("topik_i", questions, parseExamImportRows(rows));

    expect(merged.find((question) => question.section === "reading" && question.position === 1)?.options[0])
      .toBe("답안 câu 31");
    expect(merged.find((question) => question.section === "reading" && question.position === 40)?.options[0])
      .toBe("답안 câu 70");
  });

  it("khóa tiêu đề ở cả TOPIK I và TOPIK II", () => {
    const questions = buildExamSkeleton("topik_i");
    const q24 = questions.find((q) => q.section === "listening" && q.position === 24)!;
    const q25 = questions.find((q) => q.section === "listening" && q.position === 25)!;

    expect(getExamImportPermission("topik_i", questions, q24).instruction).toBe(false);
    expect(getExamImportPermission("topik_i", questions, q25).instruction).toBe(false);
    expect(getExamImportPermission("topik_ii", buildExamSkeleton("topik_ii"), buildExamSkeleton("topik_ii")[0]).instruction).toBe(false);
  });

  it("không ghi đè trường khóa khi nhập lại", () => {
    const questions = buildExamSkeleton("topik_i");
    const importedRows = buildExamImportRows("topik_i", questions);
    const header = importedRows[0];
    const instructionIndex = header.indexOf("instruction");
    const questionIndex = header.indexOf("question");
    const optionIndex = header.indexOf("option_1");
    const row = importedRows.find((candidate) => candidate[0] === "listening" && candidate[1] === "1")!;
    row[instructionIndex] = "KHÔNG ĐƯỢC GHI ĐÈ";
    row[questionIndex] = "KHÔNG ĐƯỢC GHI ĐÈ";
    row[optionIndex] = "새 답안";

    const merged = mergeExamImportQuestions("topik_i", questions, parseExamImportRows([header, row]));
    const question = merged.find((candidate) => candidate.section === "listening" && candidate.position === 1)!;

    expect(question.instruction).toBe("다음을 듣고 물음에 맞는 대답을 고르십시오.");
    expect(question.prompt).toBe("");
    expect(question.options[0]).toBe("새 답안");
  });

  it("giữ đúng ngữ liệu dùng chung khi nhập", () => {
    const questions = buildExamSkeleton("topik_ii");
    const rows = buildExamImportRows("topik_ii", questions);
    const header = rows[0];
    const passageIndex = header.indexOf("passage");
    const first = rows.find((row) => row[0] === "reading" && row[1] === "48")!;
    const second = rows.find((row) => row[0] === "reading" && row[1] === "49")!;
    first[passageIndex] = "공통 읽기 자료";

    const merged = mergeExamImportQuestions("topik_ii", questions, parseExamImportRows([header, first, second]));
    const group = merged.filter((question) => question.section === "reading" && question.position >= 48);
    expect(group.map((question) => question.passage)).toEqual([
      "공통 읽기 자료",
      "공통 읽기 자료",
      "공통 읽기 자료",
    ]);
  });

  it("tự tích đáp án đúng nhưng giữ nguyên ảnh và audio hiện có", () => {
    const questions = buildExamSkeleton("topik_ii");
    const original = questions.find((question) => question.section === "listening" && question.position === 1)!;
    original.audioUrl = "https://cdn.example.com/audio.mp3";
    original.imageUrl = "https://cdn.example.com/question.webp";
    original.optionImages = [
      "https://cdn.example.com/1.webp",
      "https://cdn.example.com/2.webp",
      "https://cdn.example.com/3.webp",
      "https://cdn.example.com/4.webp",
    ];

    const rows = buildExamImportRows("topik_ii", questions, "listening");
    const header = rows[0];
    const correctIndex = header.indexOf("correct_option");
    rows[1][correctIndex] = "3";

    const merged = mergeExamImportQuestions("topik_ii", questions, parseExamImportRows(rows));
    const updated = merged.find((question) => question.section === "listening" && question.position === 1)!;

    expect(updated.correctOption).toBe(3);
    expect(updated.audioUrl).toBe("https://cdn.example.com/audio.mp3");
    expect(updated.imageUrl).toBe("https://cdn.example.com/question.webp");
    expect(updated.optionImages).toEqual(original.optionImages);
  });
});
