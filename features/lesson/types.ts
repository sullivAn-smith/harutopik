export type StudyMode =
  | "flashcard"
  | "quiz"
  | "typing"
  | "matching"
  | "dictation"
  | "translation";

export type VocabularyTuple = readonly [
  korean: string,
  vietnamese: string,
  category: string,
];
