"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import {
  type CSSProperties,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Lesson } from "@/content/schema";
import { GrammarSection } from "@/features/lesson/components/grammar-section";
import { ModeNavigation } from "@/features/lesson/components/mode-navigation";
import {
  LessonProgressDialog,
  RestartLessonDialog,
} from "@/features/lesson/components/lesson-status-dialogs";
import {
  type TranslationDirection,
} from "@/features/lesson/components/translation-exercise";
import { VocabularyList } from "@/features/lesson/components/vocabulary-list";
import { FloatingLanguageKeyboard } from "@/features/lesson/components/floating-language-keyboard";
import type { StudyMode } from "@/features/lesson/types";
import { useLearningSync } from "@/features/learning/use-learning-sync";
import { useStudySession } from "@/features/learning/use-study-session";
import { isAcceptedAnswer } from "@/lib/learning-core/answers";
import {
  createQuizIndices,
  isPracticeComplete,
  modeMistakes,
} from "@/lib/learning-core/session";
import { generateLessonPractice } from "@/lib/learning-core/practice-generator";
import { enqueueAudioPlayback } from "@/lib/audio/playback-queue";
import { HaruLoadingMessage } from "@/components/ui/haru-lesson-loading";
import type {
  LessonProgressMode,
  LessonProgressSnapshot,
} from "@/lib/learning-core/lesson-progress";

function ExerciseLoading() {
  return <div className="grid min-h-72 place-items-center rounded-3xl bg-gradient-to-br from-sky-50 to-slate-100"><HaruLoadingMessage compact /></div>;
}

const FlashcardExercise = dynamic(
  () => import("@/features/lesson/components/flashcard-exercise").then((module) => module.FlashcardExercise),
  { loading: ExerciseLoading },
);
const FlashcardSummary = dynamic(
  () => import("@/features/lesson/components/flashcard-exercise").then((module) => module.FlashcardSummary),
  { loading: ExerciseLoading },
);
const TypingExercise = dynamic(
  () => import("@/features/lesson/components/typing-exercise").then((module) => module.TypingExercise),
  { loading: ExerciseLoading },
);
const QuizExercise = dynamic(
  () => import("@/features/lesson/components/quiz-exercise").then((module) => module.QuizExercise),
  { loading: ExerciseLoading },
);
const MatchingExercise = dynamic(
  () => import("@/features/lesson/components/matching-exercise").then((module) => module.MatchingExercise),
  { loading: ExerciseLoading },
);
const DictationExercise = dynamic(
  () => import("@/features/lesson/components/dictation-exercise").then((module) => module.DictationExercise),
  { loading: ExerciseLoading },
);
const TranslationExercise = dynamic(
  () => import("@/features/lesson/components/translation-exercise").then((module) => module.TranslationExercise),
  { loading: ExerciseLoading },
);

type Tab = "vocabulary" | "grammar";

const LESSON_RESTART_AVAILABLE_PERCENT = 75;

type LessonExperienceOptions = {
  lesson: Lesson;
  previewMode?: boolean;
  allowedModes?: readonly StudyMode[];
  backHref?: string;
  backLabel?: string;
  vocabularyOnly?: boolean;
  contextLabel?: string;
  statusLabel?: string;
  speedTestHref?: string;
  courseSlug?: string;
  lessonSlug?: string;
  initialProgress?: LessonProgressSnapshot;
};

function LessonContent({
  lesson,
  previewMode = false,
  allowedModes,
  backHref = "/courses/topik-1",
  backLabel = "Danh sách bài",
  vocabularyOnly = false,
  contextLabel,
  statusLabel,
  speedTestHref,
  courseSlug,
  lessonSlug,
  initialProgress,
}: LessonExperienceOptions) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const vocabulary = lesson.vocabulary;
  const practiceBundle = useMemo(
    () => generateLessonPractice(lesson),
    [lesson],
  );
  const fillBlankExercises = lesson.exercises.filter(
    (exercise) => exercise.type === "fill-blank",
  );
  const dictationExercises = practiceBundle.dictations;
  const translationExercises = practiceBundle.translations;
  const availableStudyModes = useMemo<StudyMode[]>(() => {
    const result: StudyMode[] = [];
    if (practiceBundle.flashcards.length > 0) result.push("flashcard");
    if (practiceBundle.typing.length > 0) result.push("typing");
    if (practiceBundle.quiz.length > 0) result.push("quiz");
    if (practiceBundle.matching.length > 0) result.push("matching");
    if (dictationExercises.length > 0) result.push("dictation");
    if (translationExercises.length > 0) result.push("translation");
    return allowedModes ? result.filter((mode) => allowedModes.includes(mode)) : result;
  }, [allowedModes, dictationExercises.length, practiceBundle, translationExercises.length]);

  const initialTab: Tab =
    searchParams.get("tab") === "grammar" ? "grammar" : "vocabulary";
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [lockedSpeedTestRedirect, setLockedSpeedTestRedirect] = useState(
    () => searchParams.get("speedTest") === "locked",
  );
  const [mode, setMode] = useState<StudyMode>("flashcard");
  const [query, setQuery] = useState("");
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [skipFlipAnimation, setSkipFlipAnimation] = useState(false);
  const [learnedIndices, setLearnedIndices] = useState<number[]>([]);
  const [flaggedIndices, setFlaggedIndices] = useState<number[]>([]);
  const [ratedIndices, setRatedIndices] = useState<number[]>([]);
  const [flashcardView, setFlashcardView] = useState<"study" | "review">(
    "study",
  );
  const [flashcardReviewIndices, setFlashcardReviewIndices] = useState<
    number[]
  >([]);
  const [flashcardReviewPosition, setFlashcardReviewPosition] = useState(0);
  const [flashcardSummary, setFlashcardSummary] = useState<
    "initial" | "complete" | null
  >(null);
  const [shuffleSeed, setShuffleSeed] = useState(1);
  const flashcardAutoAudioTimerRef = useRef<number | null>(null);
  const flashcardAutoAudioRef = useRef<HTMLAudioElement | null>(null);
  const [lessonProgress, setLessonProgress] = useState(initialProgress);
  const [progressLoading, setProgressLoading] = useState(
    !previewMode &&
      !initialProgress &&
      Boolean(courseSlug && lessonSlug),
  );
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);
  const [restartDialogOpen, setRestartDialogOpen] = useState(false);
  const [unlockToastVisible, setUnlockToastVisible] = useState(false);
  const previousSpeedTestUnlocked = useRef(
    initialProgress?.speedTestUnlocked ?? false,
  );
  const lessonSource = useMemo(
    () =>
      courseSlug && lessonSlug
        ? { courseSlug, lessonSlug }
        : undefined,
    [courseSlug, lessonSlug],
  );
  const redirectedFromLockedSpeedTest = lockedSpeedTestRedirect;
  const progressDialogVisible =
    progressDialogOpen || redirectedFromLockedSpeedTest;
  const canRestartLesson =
    (lessonProgress?.completionPercent ?? 0) >=
    LESSON_RESTART_AVAILABLE_PERCENT;
  const replaceLessonQuery = useCallback(
    (tab: Tab, clearSpeedTest = false) => {
      setActiveTab(tab);
      if (typeof window === "undefined") return;

      const params = new URLSearchParams(window.location.search);
      if (tab === "grammar") params.set("tab", "grammar");
      else params.delete("tab");

      if (clearSpeedTest) {
        params.delete("speedTest");
        setLockedSpeedTestRedirect(false);
      }

      const query = params.toString();
      window.history.replaceState(
        window.history.state,
        "",
        `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`,
      );
    },
    [],
  );
  const closeProgressDialog = useCallback(() => {
    setProgressDialogOpen(false);
    if (redirectedFromLockedSpeedTest) {
      replaceLessonQuery(activeTab, true);
    }
  }, [activeTab, replaceLessonQuery, redirectedFromLockedSpeedTest]);

  useEffect(() => {
    const syncFromHistory = () => {
      const params = new URLSearchParams(window.location.search);
      setActiveTab(params.get("tab") === "grammar" ? "grammar" : "vocabulary");
      setLockedSpeedTestRedirect(params.get("speedTest") === "locked");
    };
    window.addEventListener("popstate", syncFromHistory);
    return () => window.removeEventListener("popstate", syncFromHistory);
  }, []);
  const handleLessonProgress = useCallback(
    (nextProgress: LessonProgressSnapshot) => {
      setProgressLoading(false);
      if (
        !previousSpeedTestUnlocked.current &&
        nextProgress.speedTestUnlocked
      ) {
        setUnlockToastVisible(true);
      }
      previousSpeedTestUnlocked.current = nextProgress.speedTestUnlocked;
      setLessonProgress(nextProgress);
    },
    [],
  );

  useEffect(() => {
    if (previewMode || initialProgress || !courseSlug || !lessonSlug) return;

    const progressCourseSlug = courseSlug;
    const progressLessonSlug = lessonSlug;
    let active = true;
    async function loadProgress() {
      try {
        const query = new URLSearchParams({
          courseSlug: progressCourseSlug,
          lessonSlug: progressLessonSlug,
        });
        const response = await fetch(
          `/api/v1/learning/progress?${query.toString()}`,
          {
            credentials: "same-origin",
            cache: "no-store",
            headers: { accept: "application/json" },
          },
        );
        const payload = await response.json().catch(() => null) as {
          data?: LessonProgressSnapshot;
        } | null;
        const progress = payload?.data;
        if (
          active &&
          response.ok &&
          progress &&
          typeof progress.completionPercent === "number"
        ) {
          setLessonProgress(progress);
        }
      } finally {
        if (active) setProgressLoading(false);
      }
    }

    void loadProgress();
    return () => {
      active = false;
    };
  }, [courseSlug, initialProgress, lessonSlug, previewMode]);

  useEffect(() => {
    router.prefetch("/");
  }, [router]);

  const [quizAnswer, setQuizAnswer] = useState<string | null>(null);
  const [quizCorrectCount, setQuizCorrectCount] = useState(0);
  const [quizWrongIndices, setQuizWrongIndices] = useState<number[]>([]);
  const [quizReviewIndices, setQuizReviewIndices] = useState<number[]>([]);

  const [typedWord, setTypedWord] = useState("");
  const [typingChecked, setTypingChecked] = useState(false);
  const [typingWrongIndices, setTypingWrongIndices] = useState<number[]>([]);

  const [selectedKorean, setSelectedKorean] = useState<number | null>(null);
  const [matchedIndices, setMatchedIndices] = useState<number[]>([]);
  const [matchingWrongIndices, setMatchingWrongIndices] = useState<number[]>([]);
  const [matchingReviewMode, setMatchingReviewMode] = useState(false);
  const [matchingReviewIndices, setMatchingReviewIndices] = useState<number[]>(
    [],
  );
  const [matchingFeedback, setMatchingFeedback] = useState<{
    selectedWord: string;
    chosenMeaning: string;
    correctMeaning: string;
    correct: boolean;
  } | null>(null);

  const [dictationIndex, setDictationIndex] = useState(0);
  const [dictationInput, setDictationInput] = useState("");
  const [dictationChecked, setDictationChecked] = useState(false);
  const [dictationHint, setDictationHint] = useState(0);
  const [dictationWrongIndices, setDictationWrongIndices] = useState<number[]>(
    [],
  );

  const [translationIndex, setTranslationIndex] = useState(0);
  const [translationDirection, setTranslationDirection] =
    useState<TranslationDirection>("vi-ko");
  const [translationInput, setTranslationInput] = useState("");
  const [translationChecked, setTranslationChecked] = useState(false);
  const [
    translationViKoCompletedIndices,
    setTranslationViKoCompletedIndices,
  ] = useState<number[]>([]);
  const [translationDirectionNotice, setTranslationDirectionNotice] =
    useState("");
  const [translationWrongIndices, setTranslationWrongIndices] = useState<
    number[]
  >([]);
  const restoreStudySession = useCallback(
    (session: import("@/lib/learning-core/study-session-schema").StudySessionState) => {
      const maxVocabularyIndex = Math.max(0, vocabulary.length - 1);
      const maxDictationIndex = Math.max(0, dictationExercises.length - 1);
      const maxTranslationIndex = Math.max(0, translationExercises.length - 1);
      const validVocabularyIndices = (indices: number[]) =>
        indices.filter((index) => index <= maxVocabularyIndex);

      setMode(session.mode);
      setCurrent(Math.min(session.current, maxVocabularyIndex));
      setFlipped(session.flipped);
      setLearnedIndices(validVocabularyIndices(session.learnedIndices));
      setFlaggedIndices(validVocabularyIndices(session.flaggedIndices));
      setRatedIndices(validVocabularyIndices(session.ratedIndices));
      setFlashcardView(session.flashcardView);
      setFlashcardReviewIndices(
        validVocabularyIndices(session.flashcardReviewIndices),
      );
      setFlashcardReviewPosition(
        Math.min(
          session.flashcardReviewPosition,
          Math.max(0, session.flashcardReviewIndices.length - 1),
        ),
      );
      setShuffleSeed(session.shuffleSeed);
      setQuizAnswer(session.quizAnswer);
      setQuizCorrectCount(session.quizCorrectCount);
      setQuizWrongIndices(validVocabularyIndices(session.quizWrongIndices));
      setQuizReviewIndices(validVocabularyIndices(session.quizReviewIndices));
      setTypedWord(session.typedWord);
      setTypingChecked(session.typingChecked);
      setTypingWrongIndices(validVocabularyIndices(session.typingWrongIndices));
      setSelectedKorean(
        session.selectedKorean !== null &&
          session.selectedKorean < Math.min(4, vocabulary.length)
          ? session.selectedKorean
          : null,
      );
      setMatchedIndices(validVocabularyIndices(session.matchedIndices));
      setMatchingWrongIndices(
        validVocabularyIndices(session.matchingWrongIndices),
      );
      setMatchingReviewMode(session.matchingReviewMode);
      setMatchingReviewIndices(
        validVocabularyIndices(session.matchingReviewIndices),
      );
      setDictationIndex(
        Math.min(session.dictationIndex, maxDictationIndex),
      );
      setDictationInput(session.dictationInput);
      setDictationChecked(session.dictationChecked);
      setDictationHint(Math.min(session.dictationHint, 3));
      setDictationWrongIndices(
        session.dictationWrongIndices.filter(
          (index) => index <= maxDictationIndex,
        ),
      );
      setTranslationIndex(
        Math.min(session.translationIndex, maxTranslationIndex),
      );
      setTranslationDirection(session.translationDirection);
      setTranslationInput(session.translationInput);
      setTranslationChecked(session.translationChecked);
      setTranslationViKoCompletedIndices(
        session.translationViKoCompletedIndices.filter(
          (index) => index <= maxTranslationIndex,
        ),
      );
      setTranslationWrongIndices(
        session.translationWrongIndices.filter(
          (index) => index <= maxTranslationIndex,
        ),
      );
    },
    [dictationExercises.length, translationExercises.length, vocabulary.length],
  );
  const sessionSnapshot = useMemo(
    () => ({
      schemaVersion: 1 as const,
      mode,
      current,
      flipped,
      learnedIndices,
      flaggedIndices,
      ratedIndices,
      flashcardView,
      flashcardReviewIndices,
      flashcardReviewPosition,
      shuffleSeed,
      quizAnswer,
      quizCorrectCount,
      quizWrongIndices,
      quizReviewIndices,
      typedWord,
      typingChecked,
      typingWrongIndices,
      selectedKorean,
      matchedIndices,
      matchingWrongIndices,
      matchingReviewMode,
      matchingReviewIndices,
      dictationIndex,
      dictationInput,
      dictationChecked,
      dictationHint,
      dictationWrongIndices,
      translationIndex,
      translationDirection,
      translationInput,
      translationChecked,
      translationViKoCompletedIndices,
      translationWrongIndices,
      updatedAt: new Date().toISOString(),
    }),
    [
      current,
      dictationChecked,
      dictationHint,
      dictationIndex,
      dictationInput,
      dictationWrongIndices,
      flipped,
      flaggedIndices,
      flashcardReviewIndices,
      flashcardReviewPosition,
      flashcardView,
      learnedIndices,
      matchedIndices,
      matchingWrongIndices,
      matchingReviewIndices,
      matchingReviewMode,
      mode,
      quizAnswer,
      quizCorrectCount,
      quizReviewIndices,
      quizWrongIndices,
      ratedIndices,
      selectedKorean,
      shuffleSeed,
      translationChecked,
      translationDirection,
      translationIndex,
      translationInput,
      translationViKoCompletedIndices,
      translationWrongIndices,
      typedWord,
      typingChecked,
      typingWrongIndices,
    ],
  );
  const completedSessions = useRef(new Set<string>());
  const { syncState, completePractice, rateContent } = useLearningSync({
    lessonId: lesson.id,
    lessonVersion: lesson.version,
    lessonSource,
    onProgress: handleLessonProgress,
    enabled: !previewMode,
  });
  const {
    syncState: sessionSyncState,
    restored,
    clearSession,
  } = useStudySession({
    lessonId: lesson.id,
    lessonVersion: lesson.version,
    state: sessionSnapshot,
    onRestore: restoreStudySession,
    enabled: !previewMode,
  });

  useEffect(() => {
    if (!unlockToastVisible) return;
    const timer = window.setTimeout(
      () => setUnlockToastVisible(false),
      5_000,
    );
    return () => window.clearTimeout(timer);
  }, [unlockToastVisible]);

  const activeWord = vocabulary[current];

  const stopFlashcardAudio = useCallback(() => {
    if (flashcardAutoAudioTimerRef.current !== null) {
      window.clearTimeout(flashcardAutoAudioTimerRef.current);
      flashcardAutoAudioTimerRef.current = null;
    }
    if (flashcardAutoAudioRef.current) {
      flashcardAutoAudioRef.current.pause();
      flashcardAutoAudioRef.current.currentTime = 0;
      flashcardAutoAudioRef.current = null;
    }
  }, []);

  const playFlashcardAudio = useCallback(
    (audioUrl: string) => {
      stopFlashcardAudio();
      const audio = new Audio(audioUrl);
      flashcardAutoAudioRef.current = audio;
      void audio.play().catch(() => {
        // Trình duyệt có thể chặn lần tự phát đầu tiên trước khi người dùng tương tác.
      });
    },
    [stopFlashcardAudio],
  );

  useEffect(() => stopFlashcardAudio, [stopFlashcardAudio]);
  const quizReviewPosition = quizReviewIndices.indexOf(current);
  const quizQuestionPosition =
    quizReviewIndices.length > 0 ? Math.max(0, quizReviewPosition) : current;
  const quizQuestionTotal =
    quizReviewIndices.length > 0 ? quizReviewIndices.length : vocabulary.length;
  const quizAnsweredCount = quizQuestionPosition + (quizAnswer ? 1 : 0);
  const quizScore = `${quizCorrectCount}/${quizAnsweredCount}`;

  const matchStart = Math.floor(current / 4) * 4;
  const matchingRound = practiceBundle.matching[Math.floor(matchStart / 4)];
  const matchItems = (matchingRound?.pairs ?? []).map(
    (item) => [item.korean, item.vietnamese, item.category] as const,
  );
  const matchMeanings = matchingRound?.shuffledMeanings ?? [];
  const nextMatchingIndex = matchingReviewMode
    ? matchingReviewIndices.find(
        (index) =>
          index >= matchStart + matchItems.length &&
          !matchedIndices.includes(index),
      )
    : practiceBundle.matching[Math.floor(matchStart / 4) + 1]
      ? matchStart + 4
      : null;

  const quizOptions =
    practiceBundle.quiz[current]?.options ??
    shuffle(
      createQuizIndices(current, vocabulary.length).map(
        (index) => vocabulary[index].vietnamese,
      ),
      shuffleSeed + current,
    );

  const dictationSentence = dictationExercises[dictationIndex]?.sentence ?? "";
  const dictationCorrect = isAcceptedAnswer(
    dictationInput,
    dictationExercises[dictationIndex]?.acceptedAnswers ?? [dictationSentence],
    { ignoreWhitespace: false },
  );

  const translationPair = [
    translationExercises[translationIndex]?.vietnamese ?? "",
    translationExercises[translationIndex]?.korean ?? "",
  ] as const;
  const translationExpected =
    translationDirection === "vi-ko" ? translationPair[1] : translationPair[0];
  const translationCorrect = isAcceptedAnswer(
    translationInput,
    translationDirection === "vi-ko"
      ? translationExercises[translationIndex]?.acceptedKoreanAnswers ?? [
          translationExpected,
        ]
      : translationExercises[translationIndex]?.acceptedVietnameseAnswers ?? [
          translationExpected,
        ],
    { ignoreWhitespace: false },
  );

  const normalPracticeComplete = isPracticeComplete({
    mode,
    currentVocabularyIndex: current,
    vocabularyTotal: vocabulary.length,
    answered: mode === "quiz" ? quizAnswer !== null : typingChecked,
    matchingGroupStart: matchStart,
    matchingGroupSize: matchItems.length,
    matchedInCurrentGroup: matchedIndices.filter(
      (index) => index >= matchStart,
    ).length,
    dictationIndex,
    dictationTotal: dictationExercises.length,
    dictationChecked,
    translationIndex,
    translationTotal: translationExercises.length,
    translationChecked,
  });
  const quizPracticeComplete =
    quizAnswer !== null &&
    (quizReviewIndices.length > 0
      ? quizReviewPosition === quizReviewIndices.length - 1
      : current === vocabulary.length - 1);
  const practiceComplete =
    mode === "quiz"
      ? quizPracticeComplete
      : mode === "matching" && matchingReviewMode
      ? matchingReviewIndices.length > 0 &&
        matchingReviewIndices.every((index) => matchedIndices.includes(index))
      : mode === "translation"
        ? translationIndex === translationExercises.length - 1 &&
          translationDirection === "ko-vi" &&
          translationChecked &&
          translationViKoCompletedIndices.includes(translationIndex)
        : normalPracticeComplete;

  const modeHasMistakes =
    (mode === "quiz" && quizWrongIndices.length > 0) ||
    (mode === "typing" && typingWrongIndices.length > 0) ||
    (mode === "matching" && matchingWrongIndices.length > 0) ||
    (mode === "dictation" && dictationWrongIndices.length > 0) ||
    (mode === "translation" && translationWrongIndices.length > 0);

  useEffect(() => {
    if (!practiceComplete) return;
    if (mode === "quiz" && quizReviewIndices.length > 0) return;
    const sessionKey = `${mode}:${shuffleSeed}`;
    if (completedSessions.current.has(sessionKey)) return;
    completedSessions.current.add(sessionKey);

    const mistakes = modeMistakes(mode, {
      quiz: quizWrongIndices,
      typing: typingWrongIndices,
      matching: matchingWrongIndices,
      dictation: dictationWrongIndices,
      translation: translationWrongIndices,
    });
    const total =
      mode === "dictation"
        ? dictationExercises.length
        : mode === "translation"
          ? translationExercises.length
          : vocabulary.length;
    void completePractice(mode, Math.max(0, total - mistakes.length), total);
  }, [
    completePractice,
    dictationExercises.length,
    dictationWrongIndices,
    matchingWrongIndices,
    mode,
    practiceComplete,
    quizWrongIndices,
    quizReviewIndices.length,
    shuffleSeed,
    translationExercises.length,
    translationWrongIndices,
    typingWrongIndices,
    vocabulary.length,
  ]);

  function changeTab(tab: Tab) {
    replaceLessonQuery(tab);
  }

  function changeMode(nextMode: StudyMode) {
    if (!availableStudyModes.includes(nextMode)) return;
    setMode(nextMode);
    setShuffleSeed(Date.now());
    setCurrent(0);
    setFlashcardView("study");
    setFlashcardReviewIndices([]);
    setFlashcardReviewPosition(0);
    setFlashcardSummary(null);
    setQuizAnswer(null);
    setQuizCorrectCount(0);
    setQuizWrongIndices([]);
    setQuizReviewIndices([]);
    setTypedWord("");
    setTypingChecked(false);
    setTypingWrongIndices([]);
    setMatchedIndices([]);
    setMatchingWrongIndices([]);
    setMatchingReviewMode(false);
    setMatchingReviewIndices([]);
    setMatchingFeedback(null);
    setSelectedKorean(null);
    setDictationIndex(0);
    setDictationInput("");
    setDictationChecked(false);
    setDictationHint(0);
    setDictationWrongIndices([]);
    setTranslationIndex(0);
    setTranslationDirection("vi-ko");
    setTranslationInput("");
    setTranslationChecked(false);
    setTranslationViKoCompletedIndices([]);
    setTranslationDirectionNotice("");
    setTranslationWrongIndices([]);
  }

  function continueRecommendedLearning(mode: LessonProgressMode | null) {
    if (!mode) return;
    setProgressDialogOpen(false);
    if (mode === "grammar") {
      replaceLessonQuery("grammar", true);
      return;
    }
    if (activeTab !== "vocabulary" || redirectedFromLockedSpeedTest) {
      replaceLessonQuery("vocabulary", true);
    }
    if (availableStudyModes.includes(mode)) changeMode(mode);
  }

  function playAudioOrSpeak(audioUrl: string | undefined, text: string) {
    void text;
    if (!audioUrl) return;
    void enqueueAudioPlayback({ audioUrl });
  }

  function playFeedback(correct: boolean) {
    const AudioContextClass = window.AudioContext;
    if (!AudioContextClass) return;

    const context = new AudioContextClass();
    const notes = correct ? [523.25, 659.25, 783.99] : [293.66, 220];
    notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = correct ? "sine" : "triangle";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, context.currentTime + index * 0.16);
      gain.gain.exponentialRampToValueAtTime(
        correct ? 0.34 : 0.27,
        context.currentTime + index * 0.16 + 0.03,
      );
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        context.currentTime + index * 0.16 + 0.34,
      );
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(context.currentTime + index * 0.16);
      oscillator.stop(context.currentTime + index * 0.16 + 0.36);
    });
    window.setTimeout(() => void context.close(), 1200);
  }

  function move(step: number) {
    const next = current + step;
    if (next < 0 || next >= vocabulary.length) return;

    stopFlashcardAudio();
    setSkipFlipAnimation(true);
    setFlipped(false);
    setCurrent(next);
    const nextAudioUrl = vocabulary[next]?.audioUrl;
    if (nextAudioUrl) {
      flashcardAutoAudioTimerRef.current = window.setTimeout(() => {
        playFlashcardAudio(nextAudioUrl);
      }, 500);
    }
    window.requestAnimationFrame(() =>
      window.requestAnimationFrame(() => setSkipFlipAnimation(false)),
    );
  }

  function jumpToFlashcard(index: number) {
    if (index < 0 || index >= vocabulary.length) return;

    stopFlashcardAudio();
    setSkipFlipAnimation(true);
    setFlipped(false);
    setCurrent(index);
    const nextAudioUrl = vocabulary[index]?.audioUrl;
    if (nextAudioUrl) {
      flashcardAutoAudioTimerRef.current = window.setTimeout(() => {
        playFlashcardAudio(nextAudioUrl);
      }, 500);
    }
    window.requestAnimationFrame(() =>
      window.requestAnimationFrame(() => setSkipFlipAnimation(false)),
    );
  }

  function restartFlashcards() {
    stopFlashcardAudio();
    setSkipFlipAnimation(true);
    setFlipped(false);
    setCurrent(0);
    const firstAudioUrl = vocabulary[0]?.audioUrl;
    if (firstAudioUrl) {
      flashcardAutoAudioTimerRef.current = window.setTimeout(() => {
        playFlashcardAudio(firstAudioUrl);
      }, 500);
    }
    window.requestAnimationFrame(() =>
      window.requestAnimationFrame(() => setSkipFlipAnimation(false)),
    );
  }

  function restartFlashcardSession() {
    setFlashcardSummary(null);
    setFlashcardView("study");
    setFlashcardReviewIndices([]);
    setFlashcardReviewPosition(0);
    setFlaggedIndices([]);
    setRatedIndices([]);
    restartFlashcards();
  }

  function returnToFlashcardStart() {
    setFlashcardSummary(null);
    setFlashcardView("study");
    setFlashcardReviewIndices([]);
    setFlashcardReviewPosition(0);
    restartFlashcards();
  }

  function toggleFlashcardFlag() {
    const isFlagged = flaggedIndices.includes(current);
    if (isFlagged) {
      setFlaggedIndices((items) => items.filter((item) => item !== current));
      return;
    }

    setFlaggedIndices((items) =>
      items.includes(current) ? items : [...items, current],
    );
    setLearnedIndices((items) => items.filter((item) => item !== current));
    setRatedIndices((items) => items.filter((item) => item !== current));
  }

  function finishFlashcardSession(pendingFlagged = flaggedIndices) {
    const reviewIndices = [...new Set(pendingFlagged)].filter(
      (index) => index >= 0 && index < vocabulary.length,
    );
    for (const index of reviewIndices) {
      void rateContent("flashcard", vocabulary[index].id, "again");
    }
    void clearSession();
    setFlashcardSummary("complete");
  }

  function startFlashcardReview() {
    const reviewIndices = [...new Set(flaggedIndices)].filter(
      (index) => index >= 0 && index < vocabulary.length,
    );
    if (reviewIndices.length === 0) {
      finishFlashcardSession([]);
      return;
    }
    setFlashcardSummary(null);
    setFlashcardView("review");
    setFlashcardReviewIndices(reviewIndices);
    setFlashcardReviewPosition(0);
    jumpToFlashcard(reviewIndices[0]);
  }

  function finishInitialFlashcards() {
    setFlashcardSummary("initial");
  }

  function nextFlashcard() {
    if (flashcardView === "review") {
      const shouldKeepFlagged =
        !learnedIndices.includes(current) && !flaggedIndices.includes(current);
      const nextFlagged = shouldKeepFlagged
        ? [...flaggedIndices, current]
        : flaggedIndices;
      if (shouldKeepFlagged) setFlaggedIndices(nextFlagged);

      const nextPosition = flashcardReviewPosition + 1;
      if (nextPosition >= flashcardReviewIndices.length) {
        finishFlashcardSession(nextFlagged);
        return;
      }
      setFlashcardReviewPosition(nextPosition);
      jumpToFlashcard(flashcardReviewIndices[nextPosition]);
      return;
    }

    if (!ratedIndices.includes(current) && !flaggedIndices.includes(current)) {
      setFlaggedIndices((items) => [...items, current]);
    }
    if (current === vocabulary.length - 1) {
      finishInitialFlashcards();
      return;
    }
    move(1);
  }

  function markFlashcardLearned() {
    const nextFlagged = flaggedIndices.filter((index) => index !== current);
    setFlaggedIndices(nextFlagged);
    setLearnedIndices((items) =>
      items.includes(current) ? items : [...items, current],
    );
    setRatedIndices((items) =>
      items.includes(current) ? items : [...items, current],
    );
    void rateContent("flashcard", activeWord.id, "good");

    if (flashcardView === "review") {
      const nextPosition = flashcardReviewPosition + 1;
      if (nextPosition >= flashcardReviewIndices.length) {
        finishFlashcardSession(nextFlagged);
        return;
      }
      setFlashcardReviewPosition(nextPosition);
      jumpToFlashcard(flashcardReviewIndices[nextPosition]);
      return;
    }

    if (current === vocabulary.length - 1) {
      finishInitialFlashcards();
      return;
    }
    move(1);
  }

  function chooseQuizAnswer(answer: string) {
    if (quizAnswer) return;

    setQuizAnswer(answer);
    const correct = answer === activeWord.vietnamese;
    playFeedback(correct);
    if (correct) {
      setQuizCorrectCount((value) => value + 1);
    } else {
      addUniqueIndex(setQuizWrongIndices, current);
    }
  }

  function nextQuizQuestion() {
    if (quizReviewIndices.length > 0) {
      const nextReviewIndex = quizReviewIndices[quizReviewPosition + 1];
      if (nextReviewIndex === undefined) return;
      setCurrent(nextReviewIndex);
    } else {
      move(1);
    }
    setQuizAnswer(null);
  }

  function checkTypedWord() {
    if (!typedWord.trim()) return;

    const correct = isAcceptedAnswer(typedWord, [activeWord.korean]);
    setTypingChecked(true);
    playFeedback(correct);
    if (!correct) addUniqueIndex(setTypingWrongIndices, current);
  }

  function nextTypingWord() {
    move(1);
    setTypedWord("");
    setTypingChecked(false);
  }

  function chooseMeaning(meaning: string) {
    if (selectedKorean === null) return;

    const absoluteIndex = matchStart + selectedKorean;
    const correct = matchItems[selectedKorean]?.[1] === meaning;
    playFeedback(correct);
    setMatchingFeedback({
      selectedWord: matchItems[selectedKorean]?.[0] ?? "",
      chosenMeaning: meaning,
      correctMeaning: matchItems[selectedKorean]?.[1] ?? "",
      correct,
    });

    if (correct) {
      addUniqueIndex(setMatchedIndices, absoluteIndex);
      if (matchingReviewMode) {
        setMatchingWrongIndices((indices) =>
          indices.filter((index) => index !== absoluteIndex),
        );
      }
      setSelectedKorean(null);
    } else {
      addUniqueIndex(setMatchingWrongIndices, absoluteIndex);
      setSelectedKorean(null);
    }
  }

  function checkDictation() {
    if (!dictationInput.trim()) return;

    setDictationChecked(true);
    playFeedback(dictationCorrect);
    if (!dictationCorrect) {
      addUniqueIndex(setDictationWrongIndices, dictationIndex);
    }
  }

  function nextDictation() {
    setDictationIndex((value) => value + 1);
    setDictationInput("");
    setDictationChecked(false);
    setDictationHint(0);
  }

  function retryDictation() {
    setDictationInput("");
    setDictationChecked(false);
    setDictationHint(0);
  }

  function checkTranslation() {
    if (!translationInput.trim()) return;

    setTranslationChecked(true);
    playFeedback(translationCorrect);
    if (!translationCorrect) {
      addUniqueIndex(setTranslationWrongIndices, translationIndex);
    }
  }

  function nextTranslation() {
    setTranslationIndex((value) => value + 1);
    setTranslationDirection("vi-ko");
    setTranslationInput("");
    setTranslationChecked(false);
    setTranslationDirectionNotice("");
  }

  function changeTranslationDirection() {
    if (translationDirection === "vi-ko" && !translationChecked) {
      setTranslationDirectionNotice(
        "Hãy nhập câu tiếng Hàn và bấm “Kiểm tra” trước khi sang bước dịch tiếng Việt.",
      );
      return;
    }

    if (translationDirection === "vi-ko") {
      addUniqueIndex(
        setTranslationViKoCompletedIndices,
        translationIndex,
      );
      setTranslationDirection("ko-vi");
      setTranslationDirectionNotice(
        "Đã mở bước 2: hãy dịch câu tiếng Hàn sang tiếng Việt.",
      );
    } else {
      setTranslationDirection("vi-ko");
      setTranslationDirectionNotice("");
    }
    setTranslationInput("");
    setTranslationChecked(false);
  }

  function restartPractice() {
    changeMode(mode);
  }

  async function restartEntireSession() {
    await clearSession();
    setRestartDialogOpen(false);
    setLearnedIndices([]);
    setFlaggedIndices([]);
    setRatedIndices([]);
    setFlashcardView("study");
    setFlashcardReviewIndices([]);
    setFlashcardReviewPosition(0);
    setFlashcardSummary(null);
    setFlipped(false);
    changeMode("flashcard");
  }

  function retryMistakes() {
    const mistakes = modeMistakes(mode, {
      quiz: quizWrongIndices,
      typing: typingWrongIndices,
      matching: matchingWrongIndices,
      dictation: dictationWrongIndices,
      translation: translationWrongIndices,
    });

    if (mistakes.length === 0) return;

    if (mode === "quiz") {
      setQuizReviewIndices(mistakes);
      setQuizWrongIndices([]);
      setQuizCorrectCount(0);
      setCurrent(mistakes[0]);
      setQuizAnswer(null);
    } else if (mode === "dictation") {
      setDictationIndex(mistakes[0]);
      setDictationInput("");
      setDictationChecked(false);
    } else if (mode === "translation") {
      setTranslationIndex(mistakes[0]);
      setTranslationDirection("vi-ko");
      setTranslationInput("");
      setTranslationChecked(false);
      setTranslationViKoCompletedIndices((indices) =>
        indices.filter((index) => index !== mistakes[0]),
      );
      setTranslationDirectionNotice("");
    } else {
      setCurrent(mistakes[0]);
      setQuizAnswer(null);
      setTypedWord("");
      setTypingChecked(false);
      if (mode === "matching") {
        setMatchingReviewMode(true);
        setMatchingReviewIndices(mistakes);
        setMatchedIndices(
          vocabulary
            .map((_, index) => index)
            .filter((index) => !mistakes.includes(index)),
        );
        setMatchingFeedback(null);
      } else {
        setMatchedIndices([]);
      }
      setSelectedKorean(null);
    }
  }

  const saveLabel =
    syncState === "offline"
      ? "TIẾN ĐỘ CHỜ ĐỒNG BỘ"
      : sessionSyncState === "offline"
        ? "PHIÊN ĐÃ LƯU TRÊN THIẾT BỊ"
        : syncState === "syncing" || sessionSyncState === "saving"
          ? "ĐANG LƯU TIẾN ĐỘ"
          : syncState === "synced"
            ? "ĐÃ LƯU TIẾN ĐỘ"
            : sessionSyncState === "saved"
              ? "PHIÊN HỌC ĐÃ LƯU"
              : (statusLabel ?? "SƠ CẤP 1");

  return (
    <>
      <main className="elegant-blue min-h-screen text-[#10243e]">
      <FloatingLanguageKeyboard />
      <header className="bg-transparent">
        <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-5 py-4 md:px-8">
          <Link
            href={backHref}
            className="inline-flex w-fit items-center gap-2 rounded-full border border-white/80 bg-white/80 px-4 py-2.5 text-sm font-black text-[#245d93] shadow-[0_8px_20px_rgba(16,36,62,0.12)] backdrop-blur transition hover:-translate-y-0.5 hover:bg-white"
          >
            ← {backLabel}
          </Link>
          <span className="justify-self-center rounded-full border border-white/70 bg-[#087eba] px-5 py-2 text-center text-xs font-black tracking-wider text-white shadow-[0_8px_18px_rgba(8,126,186,0.25)]">
            {saveLabel}
          </span>
          <span aria-hidden="true" />
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-7 md:px-8">
        <section className="rounded-[2rem] border border-white/65 bg-white/35 p-5 shadow-[0_18px_45px_rgba(16,36,62,0.1)] backdrop-blur-xl md:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-[#087eba] px-4 py-2 text-lg font-black text-white shadow-[0_8px_18px_rgba(8,126,186,0.28)]">
                  {contextLabel ?? `Bài ${lesson.order}`}
                </span>
                <span className="rounded-full bg-white/70 px-3.5 py-2 text-base font-black text-[#52637a]">
                  {activeTab === "grammar"
                    ? `Ngữ pháp bài ${lesson.order}`
                    : `${vocabulary.length} từ vựng`}
                </span>
              </div>
              <div className="mt-5">
                <h1
                  lang="ko"
                  className="font-korean text-4xl font-black tracking-[-0.04em] md:text-5xl"
                >
                  {lesson.title.ko}
                </h1>
                <p className="mt-1.5 text-lg font-black text-[#344b67] md:text-xl">
                  {lesson.title.vi}
                </p>
                {activeTab === "grammar" && (
                  <p className="mt-3 max-w-3xl text-base font-semibold leading-7 text-[#52637a]">
                    {lesson.summary}
                  </p>
                )}
              </div>
            </div>
            {!vocabularyOnly && (
              <div className="ml-auto flex flex-col items-end">
                <div className="lesson-tab-switcher inline-flex rounded-2xl border border-white/80 bg-white/70 p-1.5 shadow-[0_10px_24px_rgba(16,36,62,0.12)]">
                  <button
                    type="button"
                    onClick={() => changeTab("vocabulary")}
                    className={`rounded-xl px-5 py-3 text-sm font-black transition ${
                      activeTab === "vocabulary"
                        ? "bg-[#087eba] text-white shadow-sm"
                        : "text-[#52637a] hover:bg-white"
                    }`}
                  >
                    Từ vựng
                  </button>
                  <button
                    type="button"
                    onClick={() => changeTab("grammar")}
                    className={`rounded-xl px-5 py-3 text-sm font-black transition ${
                      activeTab === "grammar"
                        ? "bg-[#087eba] text-white shadow-sm"
                        : "text-[#52637a] hover:bg-white"
                    }`}
                  >
                    Ngữ pháp
                  </button>
                </div>
                {restored && (
                  <span className="mt-2 pr-1 text-right text-xs font-bold text-emerald-700">
                    Đang tiếp tục phiên trước
                  </span>
                )}
                {canRestartLesson && (
                  <button
                    type="button"
                    onClick={() => setRestartDialogOpen(true)}
                    className="mr-1 mt-5 rounded-full border border-slate-200 bg-white/65 px-4 py-2 text-xs font-black text-[#52637a] shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:bg-white hover:text-[#087eba]"
                  >
                    ↻ Học lại từ đầu
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        {activeTab === "vocabulary" ? (
          <>
            <ModeNavigation
              activeMode={mode}
              availableModes={availableStudyModes}
              onChange={changeMode}
              speedTestHref={speedTestHref}
              speedTestProgress={lessonProgress}
              speedTestProgressLoading={progressLoading}
              onLockedSpeedTestClick={() => setProgressDialogOpen(true)}
            />

            {mode === "flashcard" && flashcardSummary && (
              <FlashcardSummary
                flaggedCount={flaggedIndices.length}
                learnedCount={learnedIndices.length}
                total={vocabulary.length}
                reviewAvailable={flaggedIndices.length > 0}
                complete={flashcardSummary === "complete"}
                onReview={
                  flashcardSummary === "initial"
                    ? startFlashcardReview
                    : undefined
                }
                onFinish={
                  flashcardSummary === "initial"
                    ? () => finishFlashcardSession()
                    : undefined
                }
                onRestart={
                  flashcardSummary === "complete"
                    ? restartFlashcardSession
                    : returnToFlashcardStart
                }
              />
            )}

            {mode === "flashcard" && !flashcardSummary && (
              <FlashcardExercise
                word={activeWord}
                lessonId={lesson.id}
                position={current}
                total={vocabulary.length}
                learnedCount={learnedIndices.length}
                flaggedCount={flaggedIndices.length}
                learned={learnedIndices.includes(current)}
                flagged={flaggedIndices.includes(current)}
                reviewMode={flashcardView === "review"}
                reviewPosition={flashcardReviewPosition}
                reviewTotal={flashcardReviewIndices.length}
                flipped={flipped}
                skipFlipAnimation={skipFlipAnimation}
                onFlip={() => setFlipped((value) => !value)}
                onReplayAudio={() => {
                  if (activeWord.audioUrl) playFlashcardAudio(activeWord.audioUrl);
                }}
                onToggleFlag={toggleFlashcardFlag}
                onMarkLearned={markFlashcardLearned}
                onPrevious={() => {
                  if (flashcardView === "review") {
                    const previousPosition = flashcardReviewPosition - 1;
                    if (previousPosition < 0) return;
                    setFlashcardReviewPosition(previousPosition);
                    jumpToFlashcard(flashcardReviewIndices[previousPosition]);
                    return;
                  }
                  move(-1);
                }}
                onNext={nextFlashcard}
                onRestart={restartFlashcards}
                nextLabel={
                  flashcardView === "review" &&
                  flashcardReviewPosition === flashcardReviewIndices.length - 1
                    ? "Kết thúc"
                    : current === vocabulary.length - 1 &&
                        flashcardView === "study"
                      ? "Kết thúc"
                      : undefined
                }
              />
            )}

            {mode === "quiz" && !practiceComplete && (
              <QuizExercise
                word={[
                  activeWord.korean,
                  activeWord.vietnamese,
                  activeWord.category,
                ]}
                options={quizOptions}
                selectedAnswer={quizAnswer}
                score={quizScore}
                position={quizQuestionPosition + 1}
                total={quizQuestionTotal}
                isLastQuestion={
                  quizReviewIndices.length > 0
                    ? quizReviewPosition === quizReviewIndices.length - 1
                    : current === vocabulary.length - 1
                }
                onAnswer={chooseQuizAnswer}
                onNext={nextQuizQuestion}
              />
            )}

            {mode === "typing" && (
              <TypingExercise
                word={[
                  activeWord.korean,
                  activeWord.vietnamese,
                  activeWord.category,
                ]}
                value={typedWord}
                checked={typingChecked}
                onChange={(value) => {
                  setTypedWord(value);
                  setTypingChecked(false);
                }}
                onCheck={checkTypedWord}
                onNext={nextTypingWord}
              />
            )}

            {mode === "matching" && (
              <MatchingExercise
                items={matchItems}
                meanings={matchMeanings}
                startIndex={matchStart}
                selectedIndex={selectedKorean}
                matchedIndices={matchedIndices}
                feedback={matchingFeedback}
                reviewMode={matchingReviewMode}
                isLastGroup={nextMatchingIndex === null || nextMatchingIndex === undefined}
                onSelectKorean={(index) => {
                  setSelectedKorean(index);
                  setMatchingFeedback(null);
                }}
                onSelectMeaning={chooseMeaning}
                onNextGroup={() => {
                  if (nextMatchingIndex === null || nextMatchingIndex === undefined) {
                    return;
                  }
                  setCurrent(nextMatchingIndex);
                  setSelectedKorean(null);
                  setMatchingFeedback(null);
                }}
              />
            )}

            {mode === "dictation" && (
              <DictationExercise
                sentence={dictationSentence}
                position={dictationIndex}
                total={dictationExercises.length}
                value={dictationInput}
                checked={dictationChecked}
                correct={dictationCorrect}
                visibleHintWords={dictationHint}
                onChange={(value) => {
                  setDictationInput(value);
                  setDictationChecked(false);
                }}
                onListen={() =>
                  playAudioOrSpeak(
                    dictationExercises[dictationIndex]?.audioUrl,
                    dictationSentence,
                  )
                }
                onHint={() =>
                  setDictationHint((value) =>
                    Math.min(
                      value + 1,
                      3,
                      dictationSentence.trim().split(/\s+/).filter(Boolean)
                        .length,
                    ),
                  )
                }
                onCheck={checkDictation}
                onRetry={retryDictation}
                onNext={nextDictation}
              />
            )}

            {mode === "translation" && (
              <TranslationExercise
                pair={translationPair}
                position={translationIndex}
                total={translationExercises.length}
                direction={translationDirection}
                value={translationInput}
                checked={translationChecked}
                correct={translationCorrect}
                directionNotice={translationDirectionNotice}
                onDirectionChange={changeTranslationDirection}
                onChange={(value) => {
                  setTranslationInput(value);
                  setTranslationChecked(false);
                  setTranslationDirectionNotice("");
                }}
                onCheck={checkTranslation}
                onNext={nextTranslation}
              />
            )}

            {practiceComplete && mode === "quiz" && (
              <section
                aria-labelledby="quiz-complete-title"
                className="quiz-completion relative mt-7 overflow-hidden rounded-[2rem] border-2 border-[#10243e] bg-white px-6 py-12 text-center shadow-[7px_8px_0_#10243e] md:px-12 md:py-16"
              >
                <div className="quiz-fireworks" aria-hidden="true">
                  {Array.from({ length: 24 }, (_, index) => (
                    <span
                      key={index}
                      style={
                        {
                          "--angle": `${(index % 8) * 45}deg`,
                          "--delay": `${(index % 6) * 90}ms`,
                          "--left": `${16 + (index % 4) * 23}%`,
                          "--particle-color": `hsl(${22 + (index % 5) * 48} 90% 56%)`,
                          "--top": `${24 + (index % 3) * 22}%`,
                        } as CSSProperties
                      }
                    />
                  ))}
                </div>
                <div className="relative z-10">
                  <p className="text-sm font-black uppercase tracking-[0.24em] text-[#087eba]">
                    Hoàn thành trắc nghiệm
                  </p>
                  <h2
                    id="quiz-complete-title"
                    className="mt-3 text-4xl font-black tracking-tight text-[#10243e] md:text-5xl"
                  >
                    Chúc mừng, bạn đã hoàn thành!
                  </h2>
                  <p className="mx-auto mt-4 max-w-2xl text-lg font-bold text-[#52637a]">
                    Bạn trả lời đúng {quizCorrectCount}/{quizQuestionTotal} câu.
                    {quizWrongIndices.length > 0
                      ? ` Còn ${quizWrongIndices.length} từ cần luyện lại.`
                      : " Bạn đã trả lời đúng toàn bộ từ vựng."}
                  </p>
                  <div className="mt-8 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={restartPractice}
                      className="rounded-2xl border-2 border-[#10243e] bg-gradient-to-r from-[#087eba] to-sky-500 px-6 py-4 text-lg font-black text-white shadow-[3px_4px_0_#10243e] transition hover:-translate-y-0.5"
                    >
                      Ôn lại từ đầu
                    </button>
                    <button
                      type="button"
                      onClick={retryMistakes}
                      disabled={!modeHasMistakes}
                      className="rounded-2xl border-2 border-[#10243e] bg-gradient-to-r from-amber-300 to-orange-400 px-6 py-4 text-lg font-black text-[#10243e] shadow-[3px_4px_0_#10243e] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-none disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none disabled:hover:translate-y-0"
                    >
                      Làm lại các từ đã sai
                    </button>
                  </div>
                </div>
              </section>
            )}

            {practiceComplete && mode !== "quiz" && (
              <div className="mt-7 rounded-3xl border-2 border-[#10243e] bg-white p-6 text-center shadow-[5px_6px_0_#10243e]">
                <p className="text-2xl font-black">Hoàn thành ôn tập! 🎉</p>
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <button
                    type="button"
                    onClick={restartPractice}
                    className="rounded-xl border-2 border-[#10243e] bg-white px-5 py-2.5 font-black"
                  >
                    ↻ Ôn lại từ đầu
                  </button>
                  {modeHasMistakes && (
                    <button
                      type="button"
                      onClick={retryMistakes}
                      className="rounded-xl border-2 border-[#10243e] bg-[#fff0e5] px-5 py-2.5 font-black text-orange-800"
                    >
                      Ôn lại câu sai
                    </button>
                  )}
                </div>
              </div>
            )}

            <VocabularyList
              lessonId={lesson.id}
              items={vocabulary}
              query={query}
              onQueryChange={setQuery}
              onSpeak={(text, audioUrl) =>
                playAudioOrSpeak(audioUrl, text)
              }
            />
          </>
        ) : (
          <GrammarSection
            lessonId={lesson.id}
            grammar={lesson.grammar}
            exercises={fillBlankExercises}
            onSpeak={(text, audioUrl) => playAudioOrSpeak(audioUrl, text)}
            onFeedback={playFeedback}
            onComplete={(score, total) =>
              void completePractice("grammar", score, total)
            }
          />
        )}
        </div>
      </main>

      {lessonProgress && (
        <LessonProgressDialog
          open={progressDialogVisible}
          progress={lessonProgress}
          speedTestHref={speedTestHref}
          onClose={closeProgressDialog}
          onContinue={() =>
            continueRecommendedLearning(lessonProgress.recommendedMode)
          }
        />
      )}
      <RestartLessonDialog
        open={restartDialogOpen}
        onClose={() => setRestartDialogOpen(false)}
        onRestart={() => void restartEntireSession()}
      />
      {unlockToastVisible && (
        <div
          role="status"
          className="fixed bottom-5 left-1/2 z-[80] -translate-x-1/2 rounded-2xl border border-emerald-200 bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-[0_18px_45px_rgba(5,95,60,.3)]"
        >
          ⚡ Bài học đã hoàn thành — Speed Test đã mở khóa.
        </div>
      )}
    </>
  );
}

function shuffle<T>(items: readonly T[], seed: number) {
  return [...items].sort((a, b) => {
    const hash = (value: T) =>
      String(value)
        .split("")
        .reduce((sum, character) => sum + character.charCodeAt(0), 0);
    return Math.sin(seed + hash(a)) - Math.sin(seed + hash(b));
  });
}

function addUniqueIndex(
  setter: React.Dispatch<React.SetStateAction<number[]>>,
  index: number,
) {
  setter((items) => (items.includes(index) ? items : [...items, index]));
}

export function LessonExperience(options: LessonExperienceOptions) {
  return (
    <Suspense fallback={<main className="elegant-blue min-h-screen" />}>
      <LessonContent {...options} />
    </Suspense>
  );
}
