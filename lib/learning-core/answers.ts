export type AnswerNormalizationOptions = {
  caseSensitive?: boolean;
  ignorePunctuation?: boolean;
  ignoreWhitespace?: boolean;
};

const punctuationPattern = /[.,!?;:'"“”‘’()[\]{}。！？、]/g;

export function normalizeAnswer(
  value: string,
  {
    caseSensitive = false,
    ignorePunctuation = true,
    ignoreWhitespace = true,
  }: AnswerNormalizationOptions = {},
) {
  let normalized = value.normalize("NFC").trim();

  if (ignorePunctuation) {
    normalized = normalized.replace(punctuationPattern, "");
  }

  normalized = ignoreWhitespace
    ? normalized.replace(/\s+/g, "")
    : normalized.replace(/\s+/g, " ");

  return caseSensitive ? normalized : normalized.toLocaleLowerCase("vi-VN");
}

export function isAcceptedAnswer(
  answer: string,
  acceptedAnswers: readonly string[],
  options?: AnswerNormalizationOptions,
) {
  const normalizedAnswer = normalizeAnswer(answer, options);

  return acceptedAnswers.some(
    (acceptedAnswer) =>
      normalizeAnswer(acceptedAnswer, options) === normalizedAnswer,
  );
}

export function uniqueIndices(values: readonly number[]) {
  return [...new Set(values)];
}

export function calculatePercentage(correct: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((Math.max(0, correct) / total) * 100);
}
