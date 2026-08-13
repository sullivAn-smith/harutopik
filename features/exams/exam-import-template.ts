import {
  completeExamSkeleton,
  shouldHideTopikIReadingPassage,
} from "@/lib/exams/exam-template";
import type { ExamLevel, ExamQuestionInput } from "@/lib/exams/types";

export const examImportHeaders = [
  "section",
  "number",
  "instruction",
  "question",
  "secondary_question",
  "underlined_text",
  "passage",
  "option_1",
  "option_2",
  "option_3",
  "option_4",
  "correct_option",
  "explanation",
] as const;

export type ExamImportPermission = {
  instruction: boolean;
  prompt: boolean;
  secondaryPrompt: boolean;
  underlinedText: boolean;
  passage: boolean;
  audio: boolean;
  image: boolean;
  optionImages: boolean;
};

function isFirstBlockMember(
  questions: readonly ExamQuestionInput[],
  question: ExamQuestionInput,
  key: "audioBlockKey" | "passageBlockKey",
) {
  const blockKey = question[key].trim();
  if (!blockKey) return true;
  return !questions.some((candidate) =>
    candidate.section === question.section
    && candidate.position < question.position
    && candidate[key] === blockKey,
  );
}

export function getExamImportPermission(
  level: ExamLevel,
  questions: readonly ExamQuestionInput[],
  question: ExamQuestionInput,
): ExamImportPermission {
  const isTopikI = level === "topik_i";
  const isListening = question.section === "listening";
  const isReading = question.section === "reading";
  const isTopikIIReading = level === "topik_ii" && isReading;
  const isPassageOwner = isFirstBlockMember(questions, question, "passageBlockKey");
  const isAudioOwner = isFirstBlockMember(questions, question, "audioBlockKey");
  const hidesTopikIPassage = shouldHideTopikIReadingPassage(level, question.section, question.position)
    || (isTopikI && isReading && question.position >= 33 && question.position <= 34);
  const hidesTopikIIPassage = isTopikIIReading && (
    (question.position >= 1 && question.position <= 10)
    || (question.position >= 25 && question.position <= 27)
    || (question.position >= 39 && question.position <= 41)
  );

  return {
    instruction: false,
    prompt: level === "topik_ii" || (isTopikI && (
      (isListening && question.position >= 29 && question.position <= 30)
      || (isReading
        && question.position >= 1
        && question.position <= 40
        && ![30, 32, 34, 36, 38, 40].includes(question.position))
    )),
    secondaryPrompt: (isTopikI && isReading && question.position === 29)
      || (isTopikIIReading && ((question.position >= 39 && question.position <= 41) || question.position === 46)),
    underlinedText: isTopikIIReading && (
      question.position === 3
      || question.position === 4
      || (isPassageOwner && (question.position === 42 || question.position === 48))
    ),
    passage: isReading && isPassageOwner && !hidesTopikIPassage && !hidesTopikIIPassage,
    audio: isListening && isAudioOwner,
    image: isReading && isPassageOwner && (
      (isTopikI && ["image_match", "practical_info"].includes(question.readingType))
      || (level === "topik_ii" && question.position >= 5 && question.position <= 10)
    ),
    optionImages: question.answerType === "image",
  };
}

export function buildExamImportRows(
  level: ExamLevel,
  sourceQuestions: readonly ExamQuestionInput[],
  section?: ExamQuestionInput["section"],
) {
  const allQuestions = completeExamSkeleton(level, [...sourceQuestions]);
  const questions = section
    ? allQuestions.filter((question) => question.section === section)
    : allQuestions;
  return [
    [...examImportHeaders],
    ...questions.map((question) => {
      const permission = getExamImportPermission(level, allQuestions, question);
      return [
        question.section,
        String(question.position),
        permission.instruction ? question.instruction : "",
        permission.prompt ? question.prompt : "",
        permission.secondaryPrompt ? question.audioText : "",
        permission.underlinedText ? question.underlinedText ?? "" : "",
        permission.passage ? question.passage : "",
        ...question.options,
        String(question.correctOption),
        question.explanation,
      ];
    }),
  ];
}

export function mergeExamImportQuestions(
  level: ExamLevel,
  currentQuestions: readonly ExamQuestionInput[],
  importedQuestions: readonly ExamQuestionInput[],
) {
  const current = completeExamSkeleton(level, [...currentQuestions]);
  const importedBySlot = new Map(
    importedQuestions.map((question) => [`${question.section}:${question.position}`, question]),
  );

  const merged = current.map((question) => {
    const imported = importedBySlot.get(`${question.section}:${question.position}`);
    if (!imported) return question;
    const permission = getExamImportPermission(level, current, question);
    return {
      ...question,
      instruction: permission.instruction ? imported.instruction : question.instruction,
      prompt: permission.prompt ? imported.prompt : question.prompt,
      underlinedText: permission.underlinedText ? imported.underlinedText : question.underlinedText,
      passage: permission.passage ? imported.passage : question.passage,
      audioText: permission.secondaryPrompt ? imported.audioText : question.audioText,
      audioUrl: question.audioUrl,
      imageUrl: question.imageUrl,
      options: imported.options,
      optionImages: question.optionImages,
      correctOption: imported.correctOption,
      explanation: imported.explanation,
    } satisfies ExamQuestionInput;
  });

  const passageByBlock = new Map<string, Pick<ExamQuestionInput, "passage" | "imageUrl" | "underlinedText">>();
  const audioByBlock = new Map<string, Pick<ExamQuestionInput, "audioText" | "audioUrl">>();
  for (const question of merged) {
    if (question.passageBlockKey && !passageByBlock.has(question.passageBlockKey)) {
      passageByBlock.set(question.passageBlockKey, {
        passage: question.passage,
        imageUrl: question.imageUrl,
        underlinedText: question.underlinedText,
      });
    }
    if (question.audioBlockKey && !audioByBlock.has(question.audioBlockKey)) {
      audioByBlock.set(question.audioBlockKey, {
        audioText: question.audioText,
        audioUrl: question.audioUrl,
      });
    }
  }

  return completeExamSkeleton(level, merged.map((question) => ({
    ...question,
    ...(question.passageBlockKey ? passageByBlock.get(question.passageBlockKey) : {}),
    ...(question.audioBlockKey ? audioByBlock.get(question.audioBlockKey) : {}),
  })));
}
