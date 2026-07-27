import type { Lesson, VocabularyItem } from "@/content/schema";
import { normalizeAnswer, normalizeKorean } from "@/lib/vocabulary/domain";

export const practiceModes = [
  "flashcard",
  "quiz",
  "typing",
  "matching",
  "translation_ko_vi",
  "translation_vi_ko",
  "dictation",
] as const;

export type PracticeMode = (typeof practiceModes)[number];

export type ModeEligibility = {
  mode: PracticeMode;
  label: string;
  eligibleCount: number;
  totalCount: number;
  available: boolean;
  source: "vocabulary" | "authored_exercise";
  requirement: string;
  missing: string[];
};

export type LessonEligibilityReport = {
  modes: ModeEligibility[];
  blockers: string[];
  warnings: string[];
  canSubmit: boolean;
  availableModes: PracticeMode[];
};

type EligibilityVocabulary = VocabularyItem & {
  acceptedVietnameseAnswers?: readonly string[];
  acceptedKoreanAnswers?: readonly string[];
};

const labels: Record<PracticeMode, string> = {
  flashcard: "Flashcard",
  quiz: "Chọn nghĩa đúng",
  typing: "Gõ lại từ tiếng Hàn",
  matching: "Nối từ",
  translation_ko_vi: "Dịch Hàn → Việt",
  translation_vi_ko: "Dịch Việt → Hàn",
  dictation: "Chép chính tả",
};

function acceptedVietnamese(item: EligibilityVocabulary) {
  return [
    item.vietnamese,
    ...(item.acceptedVietnameseAnswers ?? []),
  ].filter(Boolean);
}

function acceptedKorean(item: EligibilityVocabulary) {
  return [item.korean, ...(item.acceptedKoreanAnswers ?? [])].filter(Boolean);
}

export function evaluateLessonEligibility(
  lesson: Pick<Lesson, "vocabulary" | "exercises">,
): LessonEligibilityReport {
  const vocabulary = lesson.vocabulary as EligibilityVocabulary[];
  const total = vocabulary.length;
  const authoredDictation = lesson.exercises.filter(
    (exercise) => exercise.type === "dictation",
  ).length;
  const authoredTranslation = lesson.exercises.filter(
    (exercise) => exercise.type === "translation",
  ).length;

  const uniqueHangul = new Set(
    vocabulary.map((item) => normalizeKorean(item.korean)),
  ).size;
  const uniqueMeanings = new Set(
    vocabulary.map((item) => normalizeAnswer(item.vietnamese)),
  ).size;
  const audioCount = vocabulary.filter((item) => Boolean(item.audioUrl)).length;
  const vietnameseAnswerCount = vocabulary.filter(
    (item) => acceptedVietnamese(item).length > 0,
  ).length;
  const koreanAnswerCount = vocabulary.filter(
    (item) => acceptedKorean(item).length > 0,
  ).length;

  const modes: ModeEligibility[] = [
    {
      mode: "flashcard",
      label: labels.flashcard,
      eligibleCount: total,
      totalCount: total,
      available: total > 0,
      source: "vocabulary",
      requirement: "Cần từ tiếng Hàn và nghĩa tiếng Việt.",
      missing: total === 0 ? ["Chưa có từ vựng."] : [],
    },
    {
      mode: "quiz",
      label: labels.quiz,
      eligibleCount: total,
      totalCount: total,
      available: total >= 4 && uniqueMeanings >= 4,
      source: "vocabulary",
      requirement: "Cần ít nhất 4 từ có nghĩa khác nhau.",
      missing:
        total < 4 || uniqueMeanings < 4
          ? [`Cần thêm ${Math.max(0, 4 - Math.min(total, uniqueMeanings))} từ/nghĩa phân biệt.`]
          : [],
    },
    {
      mode: "typing",
      label: labels.typing,
      eligibleCount: total,
      totalCount: total,
      available: total > 0,
      source: "vocabulary",
      requirement: "Cần từ tiếng Hàn.",
      missing: total === 0 ? ["Chưa có từ tiếng Hàn."] : [],
    },
    {
      mode: "matching",
      label: labels.matching,
      eligibleCount: Math.min(uniqueHangul, uniqueMeanings),
      totalCount: total,
      available: uniqueHangul >= 4 && uniqueMeanings >= 4,
      source: "vocabulary",
      requirement: "Cần ít nhất 4 cặp Hàn–Việt không trùng.",
      missing:
        uniqueHangul < 4 || uniqueMeanings < 4
          ? ["Chưa đủ 4 cặp từ và nghĩa phân biệt."]
          : [],
    },
    {
      mode: "translation_ko_vi",
      label: labels.translation_ko_vi,
      eligibleCount: authoredTranslation || vietnameseAnswerCount,
      totalCount: authoredTranslation || total,
      available: authoredTranslation > 0 || vietnameseAnswerCount > 0,
      source: authoredTranslation > 0 ? "authored_exercise" : "vocabulary",
      requirement: "Cần nghĩa hoặc đáp án tiếng Việt được chấp nhận.",
      missing:
        authoredTranslation === 0 && vietnameseAnswerCount === 0
          ? ["Chưa có đáp án tiếng Việt."]
          : [],
    },
    {
      mode: "translation_vi_ko",
      label: labels.translation_vi_ko,
      eligibleCount: authoredTranslation || koreanAnswerCount,
      totalCount: authoredTranslation || total,
      available: authoredTranslation > 0 || koreanAnswerCount > 0,
      source: authoredTranslation > 0 ? "authored_exercise" : "vocabulary",
      requirement: "Cần từ hoặc đáp án tiếng Hàn được chấp nhận.",
      missing:
        authoredTranslation === 0 && koreanAnswerCount === 0
          ? ["Chưa có đáp án tiếng Hàn."]
          : [],
    },
    {
      mode: "dictation",
      label: labels.dictation,
      eligibleCount: authoredDictation || total,
      totalCount: authoredDictation || total,
      available: authoredDictation > 0 || total > 0,
      source: authoredDictation > 0 ? "authored_exercise" : "vocabulary",
      requirement: "Dùng audio CDN nếu có, nếu chưa có sẽ dùng giọng đọc của thiết bị.",
      missing:
        audioCount < total && authoredDictation === 0
          ? [`${total - audioCount} từ đang dùng giọng đọc dự phòng của thiết bị.`]
          : [],
    },
  ];

  const blockers: string[] = [];
  if (total < 4)
    blockers.push(
      `Bài học cần ít nhất 4 từ vựng để tạo đủ các dạng luyện tập (hiện có ${total}).`,
    );
  if (uniqueHangul !== total)
    blockers.push("Có từ tiếng Hàn bị trùng trong cùng bài học.");
  if (uniqueMeanings < Math.min(total, 4))
    blockers.push("Cần ít nhất 4 nghĩa tiếng Việt phân biệt.");
  const warnings = modes
    .filter((mode) => !mode.available && mode.mode !== "flashcard")
    .flatMap((mode) => mode.missing.map((message) => `${mode.label}: ${message}`));

  return {
    modes,
    blockers,
    warnings,
    canSubmit: blockers.length === 0,
    availableModes: modes.filter((mode) => mode.available).map((mode) => mode.mode),
  };
}
