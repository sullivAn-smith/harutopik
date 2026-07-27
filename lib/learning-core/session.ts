import type { StudyMode } from "@/features/lesson/types";

export type PracticeCompletionInput = {
  mode: StudyMode;
  currentVocabularyIndex: number;
  vocabularyTotal: number;
  answered: boolean;
  matchingGroupStart: number;
  matchingGroupSize: number;
  matchedInCurrentGroup: number;
  dictationIndex: number;
  dictationTotal: number;
  dictationChecked: boolean;
  translationIndex: number;
  translationTotal: number;
  translationChecked: boolean;
};

export function isPracticeComplete(input: PracticeCompletionInput) {
  switch (input.mode) {
    case "quiz":
    case "typing":
      return (
        input.vocabularyTotal > 0 &&
        input.currentVocabularyIndex === input.vocabularyTotal - 1 &&
        input.answered
      );
    case "matching":
      return (
        input.matchingGroupSize > 0 &&
        input.matchingGroupStart + input.matchingGroupSize >=
          input.vocabularyTotal &&
        input.matchedInCurrentGroup === input.matchingGroupSize
      );
    case "dictation":
      return (
        input.dictationTotal > 0 &&
        input.dictationIndex === input.dictationTotal - 1 &&
        input.dictationChecked
      );
    case "translation":
      return (
        input.translationTotal > 0 &&
        input.translationIndex === input.translationTotal - 1 &&
        input.translationChecked
      );
    case "flashcard":
      return false;
  }
}

export function createQuizIndices(
  currentIndex: number,
  total: number,
  offsets: readonly number[] = [0, 7, 13, 29],
) {
  if (total <= 0) return [];

  const indices = offsets.map(
    (offset) => (currentIndex + offset + total) % total,
  );

  for (let index = 0; new Set(indices).size < Math.min(offsets.length, total); index += 1) {
    if (!indices.includes(index % total)) indices.push(index % total);
  }

  return [...new Set(indices)].slice(0, Math.min(offsets.length, total));
}

export function modeMistakes(
  mode: StudyMode,
  mistakes: {
    quiz: readonly number[];
    typing: readonly number[];
    matching: readonly number[];
    dictation: readonly number[];
    translation: readonly number[];
  },
) {
  return mode === "flashcard" ? [] : [...mistakes[mode]];
}
