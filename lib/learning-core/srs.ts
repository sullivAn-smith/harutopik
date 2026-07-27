export type ReviewRating = "again" | "hard" | "good" | "easy";
export type ReviewState = "new" | "learning" | "review";

export type ReviewCard = {
  state: ReviewState;
  difficulty: number;
  stabilityDays: number;
  reps: number;
  lapses: number;
};

export type ReviewSchedule = ReviewCard & {
  intervalDays: number;
  dueAt: string;
  lastReviewedAt: string;
};

const ratingFactor: Record<ReviewRating, number> = {
  again: 0,
  hard: 1.2,
  good: 2.1,
  easy: 3.2,
};

const difficultyDelta: Record<ReviewRating, number> = {
  again: 1,
  hard: 0.3,
  good: -0.15,
  easy: -0.45,
};

export const newReviewCard: ReviewCard = {
  state: "new",
  difficulty: 5,
  stabilityDays: 0,
  reps: 0,
  lapses: 0,
};

export function scheduleReview(
  card: ReviewCard,
  rating: ReviewRating,
  reviewedAt = new Date(),
): ReviewSchedule {
  const isAgain = rating === "again";
  const difficulty = clamp(
    card.difficulty + difficultyDelta[rating],
    1,
    10,
  );
  const firstInterval = { again: 0, hard: 1, good: 1, easy: 4 }[rating];
  const stabilityDays =
    card.state === "new"
      ? Math.max(0.007, firstInterval)
      : isAgain
        ? Math.max(0.007, card.stabilityDays * 0.25)
        : Math.max(1, card.stabilityDays * ratingFactor[rating]);
  const intervalDays = isAgain
    ? 0
    : Math.max(1, Math.round(stabilityDays));
  const dueAt = new Date(
    reviewedAt.getTime() +
      (isAgain ? 10 * 60 * 1000 : intervalDays * 24 * 60 * 60 * 1000),
  );

  return {
    state: isAgain ? "learning" : "review",
    difficulty,
    stabilityDays,
    intervalDays,
    reps: card.reps + 1,
    lapses: card.lapses + (isAgain ? 1 : 0),
    lastReviewedAt: reviewedAt.toISOString(),
    dueAt: dueAt.toISOString(),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
