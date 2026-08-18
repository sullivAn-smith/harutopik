import { z } from "zod";

import type { VocabularyItem } from "@/content/schema";
import { normalizeAnswer } from "@/lib/learning-core/answers";
import { adaptivePriorityScore, type SpeedTestWordProgress } from "@/lib/speed-test/domain";

export const audioReactionModes = ["choose", "type"] as const;
export type AudioReactionMode = (typeof audioReactionModes)[number];
export type AudioReactionQuestionType = "word" | "sentence";
export type ReactionGameType = "audio_reaction" | "flash_reaction";
export type FlashReactionDirection = "ko_vi" | "vi_ko";
export type AudioReactionGrade = "perfect" | "great" | "good" | "miss";

export const audioReactionRules = {
  version: 1,
  startingLives: 5,
  feedbackDelayMs: 520,
  answerWindowMs: { choose: 2_000, type: 3_000 },
  thresholdsMs: {
    choose: { perfect: 700, great: 1_300, good: 2_000 },
    type: { perfect: 1_000, great: 2_000, good: 3_000 },
  },
  gradePoints: { perfect: 180, great: 140, good: 110, miss: 0 },
} as const;

export type AudioReactionQuestion = {
  id: string;
  vocabularyId: string;
  exampleId?: string;
  type: AudioReactionQuestionType;
  audioUrl: string;
  korean: string;
  correctAnswer: string;
  acceptedAnswers: string[];
  options: string[];
  category: string;
  partOfSpeech?: string;
  difficulty: number;
};

export const audioReactionFinishSchema = z.object({
  attemptId: z.string().uuid(),
  courseSlug: z.string().min(1).max(120),
  lessonSlug: z.string().min(1).max(120),
  mode: z.enum(audioReactionModes),
  gameType: z.enum(["audio_reaction", "flash_reaction"]).default("audio_reaction"),
  ranked: z.boolean().default(false),
  direction: z.enum(["ko_vi", "vi_ko"]).default("ko_vi"),
  requestedQuestionCount: z.union([z.literal(10), z.literal(20), z.literal(30)]),
  questionIds: z.array(z.string().min(1).max(500)).min(1).max(30),
  answers: z.array(z.object({
    questionId: z.string().min(1).max(500),
    vocabularyId: z.string().min(1).max(200),
    exampleId: z.string().min(1).max(200).optional(),
    userAnswer: z.string().max(500),
    reactionTimeMs: z.number().int().min(0).max(60_000),
    position: z.number().int().min(1).max(30),
  })).max(30),
  totalTimeMs: z.number().int().min(0).max(3_600_000),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime(),
}).superRefine((input, context) => {
  if (new Set(input.questionIds).size !== input.questionIds.length) {
    context.addIssue({ code: "custom", path: ["questionIds"], message: "Danh sách câu hỏi bị trùng." });
  }
  if (input.answers.some((answer, index) =>
    answer.position !== index + 1 || input.questionIds[index] !== answer.questionId
  )) {
    context.addIssue({ code: "custom", path: ["answers"], message: "Thứ tự câu trả lời không hợp lệ." });
  }
  if (input.questionIds.length !== input.requestedQuestionCount) {
    context.addIssue({ code: "custom", path: ["questionIds"], message: "Số câu hỏi không khớp thử thách đã chọn." });
  }
  if (
    input.ranked &&
    (
      input.gameType !== "audio_reaction" ||
      input.mode !== "choose" ||
      input.requestedQuestionCount !== 10
    )
  ) {
    context.addIssue({
      code: "custom",
      path: ["ranked"],
      message: "Cấu hình Audio Reaction xếp hạng không hợp lệ.",
    });
  }
});

function shuffled<T>(items: readonly T[], random: () => number) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

export function createAudioReactionPool(vocabulary: readonly VocabularyItem[]) {
  const questions: AudioReactionQuestion[] = [];
  for (const item of vocabulary) {
    if (!item.audioUrl) continue;
    questions.push({
      id: `word:${item.id}`,
      vocabularyId: item.id,
      type: "word",
      audioUrl: item.audioUrl,
      korean: item.korean,
      correctAnswer: item.vietnamese,
      acceptedAnswers: [item.vietnamese, ...(item.acceptedVietnameseAnswers ?? [])],
      options: [],
      category: item.category,
      partOfSpeech: item.partOfSpeech,
      difficulty: 1,
    });
  }
  return questions;
}

export function createFlashReactionPool(
  vocabulary: readonly VocabularyItem[],
  direction: FlashReactionDirection,
) {
  return vocabulary.map<AudioReactionQuestion>((item) => ({
    id: `flash:${direction}:${item.id}`,
    vocabularyId: item.id,
    type: "word",
    audioUrl: "",
    korean: direction === "ko_vi" ? item.korean : item.vietnamese,
    correctAnswer: direction === "ko_vi" ? item.vietnamese : item.korean,
    acceptedAnswers: direction === "ko_vi"
      ? [item.vietnamese, ...(item.acceptedVietnameseAnswers ?? [])]
      : [item.korean, ...(item.acceptedKoreanAnswers ?? [])],
    options: [],
    category: item.category,
    partOfSpeech: item.partOfSpeech,
    difficulty: direction === "vi_ko" ? 1.15 : 1,
  }));
}

function progressPriority(
  question: AudioReactionQuestion,
  progress: Readonly<Record<string, SpeedTestWordProgress>>,
) {
  return adaptivePriorityScore(progress[question.vocabularyId]);
}

function addDistractors(
  selected: readonly AudioReactionQuestion[],
  fullPool: readonly AudioReactionQuestion[],
  random: () => number,
) {
  let previousCorrectIndex = -1;
  return selected.map((question) => {
    const normalizedCorrect = normalizeAnswer(question.correctAnswer);
    const sameType = fullPool.filter((candidate) =>
      candidate.id !== question.id &&
      candidate.type === question.type &&
      normalizeAnswer(candidate.correctAnswer) !== normalizedCorrect
    );
    const ranked = sameType.sort((left, right) => {
      const leftScore = Number(left.partOfSpeech === question.partOfSpeech) * 2 + Number(left.category === question.category);
      const rightScore = Number(right.partOfSpeech === question.partOfSpeech) * 2 + Number(right.category === question.category);
      return rightScore - leftScore;
    });
    const distractors = shuffled(ranked.slice(0, 8), random)
      .filter((candidate, index, array) => array.findIndex((item) => normalizeAnswer(item.correctAnswer) === normalizeAnswer(candidate.correctAnswer)) === index)
      .slice(0, 3)
      .map((candidate) => candidate.correctAnswer);
    const options = shuffled([question.correctAnswer, ...distractors], random);
    if (options.length > 1 && options.indexOf(question.correctAnswer) === previousCorrectIndex) {
      const correctIndex = options.indexOf(question.correctAnswer);
      const swapIndex = (correctIndex + 1) % options.length;
      [options[correctIndex], options[swapIndex]] = [options[swapIndex], options[correctIndex]];
    }
    previousCorrectIndex = options.indexOf(question.correctAnswer);
    return { ...question, options };
  });
}

export function buildAudioReactionQuestions({
  vocabulary,
  questionCount,
  progressById = {},
  random = Math.random,
}: {
  vocabulary: readonly VocabularyItem[];
  questionCount: 10 | 20 | 30;
  progressById?: Readonly<Record<string, SpeedTestWordProgress>>;
  random?: () => number;
}) {
  const pool = createAudioReactionPool(vocabulary);
  const target = Math.min(questionCount, pool.length);
  const priority = shuffled(
    pool.filter((item) => progressPriority(item, progressById) >= 45),
    random,
  ).sort(
    (left, right) =>
      progressPriority(right, progressById) -
      progressPriority(left, progressById),
  );
  const normal = shuffled(
    pool.filter((item) => progressPriority(item, progressById) < 45),
    random,
  );
  const priorityTarget = Math.min(priority.length, Math.ceil(target * 0.4));
  const selected = shuffled(
    [
      ...priority.slice(0, priorityTarget),
      ...normal,
      ...priority.slice(priorityTarget),
    ].slice(0, target),
    random,
  );
  return addDistractors(selected, pool, random);
}

export function buildFlashReactionQuestions({
  vocabulary,
  direction,
  questionCount,
  progressById = {},
  random = Math.random,
}: {
  vocabulary: readonly VocabularyItem[];
  direction: FlashReactionDirection;
  questionCount: 10 | 20 | 30;
  progressById?: Readonly<Record<string, SpeedTestWordProgress>>;
  random?: () => number;
}) {
  const pool = createFlashReactionPool(vocabulary, direction);
  const ranked = [...pool].sort((left, right) =>
    adaptivePriorityScore(progressById[right.vocabularyId]) - adaptivePriorityScore(progressById[left.vocabularyId])
  );
  const priorityCount = Math.min(ranked.length, Math.ceil(questionCount * 0.4));
  const priority = shuffled(ranked.slice(0, priorityCount), random);
  const rest = shuffled(ranked.slice(priorityCount), random);
  const selected = shuffled([...priority, ...rest].slice(0, questionCount), random);
  return addDistractors(selected, pool, random);
}

export function isCorrectAudioReactionAnswer(answer: string, question: AudioReactionQuestion) {
  const normalized = normalizeAnswer(answer);
  return question.acceptedAnswers.some((candidate) => normalizeAnswer(candidate) === normalized);
}

export function gradeAudioReaction(mode: AudioReactionMode, correct: boolean, reactionTimeMs: number): AudioReactionGrade {
  if (!correct) return "miss";
  const thresholds = audioReactionRules.thresholdsMs[mode];
  if (reactionTimeMs <= thresholds.perfect) return "perfect";
  if (reactionTimeMs <= thresholds.great) return "great";
  if (reactionTimeMs <= thresholds.good) return "good";
  return "miss";
}

export function streakMultiplier(streak: number) {
  if (streak >= 10) return 2;
  if (streak >= 7) return 1.5;
  if (streak >= 5) return 1.25;
  if (streak >= 3) return 1.1;
  return 1;
}

export function scoreAudioReactionAnswer(question: AudioReactionQuestion, grade: AudioReactionGrade, streak: number) {
  return Math.round(audioReactionRules.gradePoints[grade] * streakMultiplier(streak) * question.difficulty);
}
