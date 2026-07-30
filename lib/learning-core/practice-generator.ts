import type { Lesson, VocabularyItem } from "@/content/schema";
import { normalizeAnswer, normalizeKorean } from "@/lib/vocabulary/domain";
import { evaluateLessonEligibility } from "@/lib/vocabulary/eligibility";

export type QuizQuestion = {
  vocabularyId: string;
  prompt: string;
  answer: string;
  options: string[];
};

export type MatchingRound = {
  id: string;
  pairs: Array<{
    vocabularyId: string;
    korean: string;
    vietnamese: string;
    category: string;
  }>;
  shuffledMeanings: string[];
};

export type GeneratedTranslation = {
  id: string;
  vocabularyId?: string;
  korean: string;
  vietnamese: string;
  acceptedKoreanAnswers: string[];
  acceptedVietnameseAnswers: string[];
  source: "vocabulary" | "authored";
};

export type GeneratedDictation = {
  id: string;
  vocabularyId?: string;
  sentence: string;
  audioUrl?: string;
  acceptedAnswers: string[];
  source: "vocabulary" | "authored";
};

export type PracticeBundle = {
  flashcards: VocabularyItem[];
  typing: VocabularyItem[];
  quiz: QuizQuestion[];
  matching: MatchingRound[];
  translations: GeneratedTranslation[];
  dictations: GeneratedDictation[];
};

function hashSeed(value: string) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function seededShuffle<T>(
  input: readonly T[],
  seed: string,
): T[] {
  const items = [...input];
  let state = hashSeed(seed) || 1;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  for (let index = items.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [items[index], items[target]] = [items[target], items[index]];
  }
  return items;
}

function uniqueMeanings(vocabulary: readonly VocabularyItem[]) {
  const seen = new Set<string>();
  return vocabulary.filter((item) => {
    const normalized = normalizeAnswer(item.vietnamese);
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function rankDistractors(
  item: VocabularyItem,
  candidates: readonly VocabularyItem[],
  seed: string,
) {
  return seededShuffle(candidates, seed).sort((left, right) => {
    const score = (candidate: VocabularyItem) =>
      (candidate.category === item.category ? 4 : 0) +
      (candidate.partOfSpeech &&
      candidate.partOfSpeech === item.partOfSpeech
        ? 3
        : 0) +
      (Math.abs(candidate.korean.length - item.korean.length) <= 1 ? 1 : 0);
    return score(right) - score(left);
  });
}

function uniqueMatchingItems(vocabulary: readonly VocabularyItem[]) {
  const hangul = new Set<string>();
  const meanings = new Set<string>();
  return vocabulary.filter((item) => {
    const normalizedHangul = normalizeKorean(item.korean);
    const normalizedMeaning = normalizeAnswer(item.vietnamese);
    if (hangul.has(normalizedHangul) || meanings.has(normalizedMeaning))
      return false;
    hangul.add(normalizedHangul);
    meanings.add(normalizedMeaning);
    return true;
  });
}

export function generateLessonPractice(lesson: Lesson): PracticeBundle {
  const eligibility = evaluateLessonEligibility(lesson);
  const vocabulary = lesson.vocabulary;
  const distinctMeanings = uniqueMeanings(vocabulary);

  const quiz = eligibility.availableModes.includes("quiz")
    ? vocabulary.map((item) => {
        const distractors = rankDistractors(
          item,
          distinctMeanings.filter(
            (candidate) =>
              normalizeAnswer(candidate.vietnamese) !==
              normalizeAnswer(item.vietnamese),
          ),
          `${lesson.id}:${lesson.version}:quiz:${item.id}`,
        )
          .slice(0, 3)
          .map((candidate) => candidate.vietnamese);
        return {
          vocabularyId: item.id,
          prompt: item.korean,
          answer: item.vietnamese,
          options: seededShuffle(
            [item.vietnamese, ...distractors],
            `${lesson.id}:${lesson.version}:options:${item.id}`,
          ),
        };
      })
    : [];

  const matching: MatchingRound[] = [];
  if (eligibility.availableModes.includes("matching")) {
    const matchingItems = uniqueMatchingItems(vocabulary);
    for (let start = 0; start < matchingItems.length; start += 4) {
      const group = matchingItems.slice(start, start + 4);
      if (group.length < 2) break;
      const pairs = group.map((item) => ({
        vocabularyId: item.id,
        korean: item.korean,
        vietnamese: item.vietnamese,
        category: item.category,
      }));
      matching.push({
        id: `${lesson.id}-matching-${start / 4 + 1}`,
        pairs,
        shuffledMeanings: seededShuffle(
          pairs.map((pair) => pair.vietnamese),
          `${lesson.id}:${lesson.version}:matching:${start}`,
        ),
      });
    }
  }

  const vocabularyTranslations: GeneratedTranslation[] = vocabulary.map(
    (item) => ({
      id: `${lesson.id}-translation-${item.id}`,
      vocabularyId: item.id,
      korean: item.korean,
      vietnamese: item.vietnamese,
      acceptedKoreanAnswers: [
        item.korean,
        ...(item.acceptedKoreanAnswers ?? []),
      ].filter(
        (answer, index, answers) =>
          answers.findIndex(
            (candidate) =>
              normalizeKorean(candidate) === normalizeKorean(answer),
          ) === index,
      ),
      acceptedVietnameseAnswers: [
        item.vietnamese,
        ...(item.acceptedVietnameseAnswers ?? []),
      ].filter(
        (answer, index, answers) =>
          answers.findIndex(
            (candidate) =>
              normalizeAnswer(candidate) === normalizeAnswer(answer),
          ) === index,
      ),
      source: "vocabulary" as const,
    }),
  );
  const authoredTranslations: GeneratedTranslation[] = lesson.exercises
    .filter((exercise) => exercise.type === "translation")
    .map((exercise) => ({
      id: exercise.id,
      korean: exercise.korean,
      vietnamese: exercise.vietnamese,
      acceptedKoreanAnswers: [
        exercise.korean,
        ...exercise.acceptedKoreanAnswers,
      ],
      acceptedVietnameseAnswers: [
        exercise.vietnamese,
        ...exercise.acceptedVietnameseAnswers,
      ],
      source: "authored" as const,
    }));

  const vocabularyDictations: GeneratedDictation[] = vocabulary.map((item) => ({
      id: `${lesson.id}-dictation-${item.id}`,
      vocabularyId: item.id,
      sentence: item.korean,
      audioUrl: item.audioUrl,
      acceptedAnswers: [item.korean, ...(item.acceptedKoreanAnswers ?? [])],
      source: "vocabulary" as const,
    }));
  const authoredDictations: GeneratedDictation[] = lesson.exercises
    .filter((exercise) => exercise.type === "dictation")
    .map((exercise) => ({
      id: exercise.id,
      sentence: exercise.sentence,
      audioUrl: exercise.audioUrl,
      acceptedAnswers: [exercise.sentence],
      source: "authored" as const,
    }));

  return {
    flashcards: [...vocabulary],
    typing: [...vocabulary],
    quiz,
    matching,
    translations:
      authoredTranslations.length > 0
        ? authoredTranslations
        : vocabularyTranslations,
    dictations:
      authoredDictations.length > 0 ? authoredDictations : vocabularyDictations,
  };
}
