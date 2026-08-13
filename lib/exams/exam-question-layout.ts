import type { ExamLevel, ExamSection } from "./types";

export type ExamTextAnswerLayout = "default" | "horizontal" | "two_columns" | "vertical";

const TOPIK_II_LISTENING_TWO_COLUMNS = new Set([6, 7, 9, 11, 12, 29]);
const TOPIK_II_READING_HORIZONTAL = new Set([5, 6, 7, 8, 18, 19, 39, 40, 41, 46]);
const TOPIK_II_READING_VERTICAL = new Set([
  9, 10, 11, 12, 20, 22, 24, 25, 26,
  27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38,
  43, 44, 45, 47, 48, 49, 50,
]);

export function getTopikIITextAnswerLayout(
  level: ExamLevel | undefined,
  section: ExamSection,
  position: number,
): ExamTextAnswerLayout {
  if (level !== "topik_ii") return "default";
  if (section === "listening") {
    return TOPIK_II_LISTENING_TWO_COLUMNS.has(position) ? "two_columns" : "vertical";
  }
  if (TOPIK_II_READING_HORIZONTAL.has(position)) return "horizontal";
  if (TOPIK_II_READING_VERTICAL.has(position)) return "vertical";
  return "default";
}

export function showsTopikIIReadingImageAbove(
  level: ExamLevel | undefined,
  section: ExamSection,
  position: number,
) {
  return level === "topik_ii" && section === "reading" && position >= 5 && position <= 10;
}

export function usesCompactTopikIIReadingImageFrame(
  level: ExamLevel | undefined,
  section: ExamSection,
  position: number,
) {
  return level === "topik_ii" && section === "reading" && position >= 5 && position <= 8;
}

export function showsTopikIIReadingTitleAbove(
  level: ExamLevel | undefined,
  section: ExamSection,
  position: number,
) {
  return level === "topik_ii" && section === "reading" && (
    (position >= 5 && position <= 18)
    || (position >= 28 && position <= 38)
  );
}

export function boxesTopikIIReadingPrimaryPrompt(
  level: ExamLevel | undefined,
  section: ExamSection,
  position: number,
) {
  return level === "topik_ii" && section === "reading" && position >= 39 && position <= 41;
}

export function boxesTopikIIReadingSecondaryPrompt(
  level: ExamLevel | undefined,
  section: ExamSection,
  position: number,
) {
  return level === "topik_ii" && section === "reading" && (
    (position >= 39 && position <= 41) || position === 46
  );
}
