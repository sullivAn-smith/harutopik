"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Lesson } from "@/content/schema";
import { DictationExercise } from "@/features/lesson/components/dictation-exercise";
import { FlashcardExercise } from "@/features/lesson/components/flashcard-exercise";
import { GrammarSection } from "@/features/lesson/components/grammar-section";
import { MatchingExercise } from "@/features/lesson/components/matching-exercise";
import { ModeNavigation } from "@/features/lesson/components/mode-navigation";
import { QuizExercise } from "@/features/lesson/components/quiz-exercise";
import {
  TranslationExercise,
  type TranslationDirection,
} from "@/features/lesson/components/translation-exercise";
import { TypingExercise } from "@/features/lesson/components/typing-exercise";
import { VocabularyList } from "@/features/lesson/components/vocabulary-list";
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

type Tab = "vocabulary" | "grammar";

type LessonExperienceOptions = {
  lesson: Lesson;
  previewMode?: boolean;
  allowedModes?: readonly StudyMode[];
  backHref?: string;
  backLabel?: string;
  vocabularyOnly?: boolean;
  contextLabel?: string;
  statusLabel?: string;
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

  const activeTab: Tab =
    searchParams.get("tab") === "grammar" ? "grammar" : "vocabulary";
  const [mode, setMode] = useState<StudyMode>("flashcard");
  const [query, setQuery] = useState("");
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [skipFlipAnimation, setSkipFlipAnimation] = useState(false);
  const [learnedIndices, setLearnedIndices] = useState<number[]>([]);
  const [shuffleSeed, setShuffleSeed] = useState(1);

  const [quizAnswer, setQuizAnswer] = useState<string | null>(null);
  const [quizCorrectCount, setQuizCorrectCount] = useState(0);
  const [quizWrongIndices, setQuizWrongIndices] = useState<number[]>([]);

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
      setShuffleSeed(session.shuffleSeed);
      setQuizAnswer(session.quizAnswer);
      setQuizCorrectCount(session.quizCorrectCount);
      setQuizWrongIndices(validVocabularyIndices(session.quizWrongIndices));
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
      setDictationHint(session.dictationHint);
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
      shuffleSeed,
      quizAnswer,
      quizCorrectCount,
      quizWrongIndices,
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
      learnedIndices,
      matchedIndices,
      matchingWrongIndices,
      matchingReviewIndices,
      matchingReviewMode,
      mode,
      quizAnswer,
      quizCorrectCount,
      quizWrongIndices,
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
    enabled: !previewMode,
  });
  const {
    syncState: sessionSyncState,
    restored,
    dismissRestoreNotice,
    clearSession,
  } = useStudySession({
    lessonId: lesson.id,
    lessonVersion: lesson.version,
    state: sessionSnapshot,
    onRestore: restoreStudySession,
    enabled: !previewMode,
  });

  const activeWord = vocabulary[current];
  const quizAnsweredCount = current + (quizAnswer ? 1 : 0);
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
  const practiceComplete =
    mode === "matching" && matchingReviewMode
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
    shuffleSeed,
    translationExercises.length,
    translationWrongIndices,
    typingWrongIndices,
    vocabulary.length,
  ]);

  function changeTab(tab: Tab) {
    router.push(`?tab=${tab}`, { scroll: false });
  }

  function changeMode(nextMode: StudyMode) {
    if (!availableStudyModes.includes(nextMode)) return;
    setMode(nextMode);
    setShuffleSeed(Date.now());
    setCurrent(0);
    setQuizAnswer(null);
    setQuizCorrectCount(0);
    setQuizWrongIndices([]);
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

  function playAudioOrSpeak(audioUrl: string | undefined, text: string) {
    void enqueueAudioPlayback({ audioUrl, fallbackText: text });
  }

  function speak(text: string) {
    void enqueueAudioPlayback({ fallbackText: text });
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

    setSkipFlipAnimation(true);
    setFlipped(false);
    setCurrent(next);
    window.requestAnimationFrame(() =>
      window.requestAnimationFrame(() => setSkipFlipAnimation(false)),
    );
  }

  function restartFlashcards() {
    setSkipFlipAnimation(true);
    setFlipped(false);
    setCurrent(0);
    window.requestAnimationFrame(() =>
      window.requestAnimationFrame(() => setSkipFlipAnimation(false)),
    );
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
    move(1);
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
    setLearnedIndices([]);
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

    if (mode === "dictation") {
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
    sessionSyncState === "saving"
      ? "ĐANG LƯU PHIÊN"
      : sessionSyncState === "saved"
        ? "PHIÊN HỌC ĐÃ LƯU"
        : sessionSyncState === "offline"
          ? "ĐÃ LƯU TRÊN THIẾT BỊ"
          : syncState === "syncing"
            ? "ĐANG ĐỒNG BỘ"
            : syncState === "synced"
              ? "ĐÃ LƯU TIẾN ĐỘ"
              : syncState === "offline"
                ? "SẼ ĐỒNG BỘ KHI CÓ MẠNG"
                : (statusLabel ?? "SƠ CẤP 1");

  return (
    <main className="elegant-blue min-h-screen text-[#10243e]">
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
        <section className="flex flex-col justify-between gap-6 rounded-[2rem] border border-white/65 bg-white/35 p-6 shadow-[0_18px_45px_rgba(16,36,62,0.1)] backdrop-blur-xl md:flex-row md:items-end md:p-8">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-[#087eba] px-5 py-2.5 text-xl font-black text-white shadow-[0_8px_18px_rgba(8,126,186,0.28)]">
                {contextLabel ?? `Bài ${lesson.order}`}
              </span>
              <span className="rounded-full bg-white/70 px-4 py-2 text-lg font-black text-[#52637a]">
                {activeTab === "grammar"
                  ? `Ngữ pháp bài ${lesson.order}`
                  : `${vocabulary.length} từ vựng`}
              </span>
            </div>
            <h1
              lang="ko"
              className="font-korean mt-4 text-5xl font-black tracking-[-0.04em]"
            >
              {lesson.title.ko}
            </h1>
            <p className="mt-2 text-xl font-black text-[#344b67]">
              {lesson.title.vi}
            </p>
            {activeTab === "grammar" && (
              <p className="mt-3 max-w-3xl text-base font-semibold leading-7 text-[#52637a]">
                {lesson.summary}
              </p>
            )}
          </div>
          {!vocabularyOnly && (
            <div className="lesson-tab-switcher inline-flex self-start rounded-2xl border border-white/80 bg-white/70 p-1.5 shadow-[0_10px_24px_rgba(16,36,62,0.12)]">
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
          )}
        </section>

        {restored && (
          <div
            role="status"
            className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/90 px-5 py-4 text-emerald-950 shadow-sm"
          >
            <div>
              <p className="font-black">Đã khôi phục phiên học gần nhất</p>
              <p className="mt-1 text-sm font-semibold text-emerald-800">
                Bạn đang tiếp tục đúng chế độ và vị trí trước khi rời bài.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={dismissRestoreNotice}
                className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-black text-white"
              >
                Tiếp tục
              </button>
              <button
                type="button"
                onClick={() => void restartEntireSession()}
                className="rounded-xl border border-emerald-300 bg-white px-4 py-2 text-sm font-black text-emerald-900"
              >
                Học lại từ đầu
              </button>
            </div>
          </div>
        )}

        {activeTab === "vocabulary" ? (
          <>
            <ModeNavigation
              activeMode={mode}
              availableModes={availableStudyModes}
              onChange={changeMode}
            />

            {mode === "flashcard" && (
              <FlashcardExercise
                word={activeWord}
                lessonId={lesson.id}
                position={current}
                total={vocabulary.length}
                learnedCount={learnedIndices.length}
                learned={learnedIndices.includes(current)}
                flipped={flipped}
                skipFlipAnimation={skipFlipAnimation}
                onFlip={() => setFlipped((value) => !value)}
                onSpeak={() =>
                  playAudioOrSpeak(activeWord.audioUrl, activeWord.korean)
                }
                onToggleLearned={() => {
                  const learned = learnedIndices.includes(current);
                  setLearnedIndices((items) =>
                    learned
                      ? items.filter((item) => item !== current)
                      : [...items, current],
                  );
                  void rateContent(
                    "flashcard",
                    activeWord.id,
                    learned ? "again" : "good",
                  );
                }}
                onMarkLearned={() => {
                  addUniqueIndex(setLearnedIndices, current);
                  void rateContent("flashcard", activeWord.id, "good");
                }}
                onMarkUnlearned={() => {
                  setLearnedIndices((items) =>
                    items.filter((item) => item !== current),
                  );
                  void rateContent("flashcard", activeWord.id, "again");
                }}
                onPrevious={() => move(-1)}
                onNext={() => move(1)}
                onRestart={restartFlashcards}
              />
            )}

            {mode === "quiz" && (
              <QuizExercise
                word={[
                  activeWord.korean,
                  activeWord.vietnamese,
                  activeWord.category,
                ]}
                options={quizOptions}
                selectedAnswer={quizAnswer}
                score={quizScore}
                isLastQuestion={current === vocabulary.length - 1}
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
                    Math.min(value + 1, dictationSentence.split(" ").length),
                  )
                }
                onCheck={checkDictation}
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

            {practiceComplete && (
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
            grammar={lesson.grammar}
            exercises={fillBlankExercises}
            onSpeak={speak}
            onFeedback={playFeedback}
            onComplete={(score, total) =>
              void completePractice("grammar", score, total)
            }
          />
        )}
      </div>
    </main>
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
