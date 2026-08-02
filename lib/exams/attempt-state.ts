import type { ExamSection } from "./types";

export function canAccessQuestion(input: {
  section: ExamSection;
  currentPosition: number;
  questionSection: ExamSection;
  questionPosition: number;
}) {
  if (input.questionSection !== input.section) return false;
  return input.section === "reading" || input.questionPosition === input.currentPosition;
}

export function mergeAttemptAnswer(
  answers: Readonly<Record<string, number>>,
  questionId: string,
  option: number | null,
) {
  return option === null ? { ...answers } : { ...answers, [questionId]: option };
}

type SnapshotQuestion = {
  id: string;
  section: ExamSection;
  correct_option: number;
};

export function scoreAttemptSnapshot(
  questions: readonly SnapshotQuestion[],
  answers: Readonly<Record<string, number>>,
) {
  const count = (section: ExamSection) => {
    const sectionQuestions = questions.filter((question) => question.section === section);
    const correct = sectionQuestions.filter(
      (question) => answers[question.id] === question.correct_option,
    ).length;
    return { correct, total: sectionQuestions.length };
  };
  const listening = count("listening");
  const reading = count("reading");
  const percentage = (correct: number, total: number) =>
    total === 0 ? 0 : Math.round((correct / total) * 100);
  return {
    listeningCorrect: listening.correct,
    listeningTotal: listening.total,
    listeningScore: percentage(listening.correct, listening.total),
    readingCorrect: reading.correct,
    readingTotal: reading.total,
    readingScore: percentage(reading.correct, reading.total),
    correctCount: listening.correct + reading.correct,
    totalQuestions: listening.total + reading.total,
    totalScore:
      percentage(listening.correct, listening.total) +
      percentage(reading.correct, reading.total),
  };
}
