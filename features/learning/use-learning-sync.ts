"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { StudyMode } from "@/features/lesson/types";
import type { LearningEventInput } from "@/lib/learning-core/progress-schema";
import type { ReviewRating } from "@/lib/learning-core/srs";

const queueKey = "harutopik:pending-learning-events:v1";
const maxQueuedEvents = 50;

type LearningSyncOptions = {
  lessonId: string;
  lessonVersion: number;
  enabled?: boolean;
};

export function useLearningSync({
  lessonId,
  lessonVersion,
  enabled = true,
}: LearningSyncOptions) {
  const startedAt = useRef(0);
  const [syncState, setSyncState] = useState<
    "idle" | "syncing" | "synced" | "offline"
  >("idle");

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  const send = useCallback(async (event: LearningEventInput) => {
    if (!enabled) return;
    setSyncState("syncing");
    try {
      const response = await fetch("/api/v1/learning/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(event),
      });
      if (response.status === 401) {
        setSyncState("idle");
        return;
      }
      if (response.status === 503) {
        setSyncState("idle");
        return;
      }
      if (response.status >= 400 && response.status < 500) {
        removeQueuedEvent(event.eventId);
        setSyncState("idle");
        return;
      }
      if (!response.ok) throw new Error("Learning sync failed");
      removeQueuedEvent(event.eventId);
      setSyncState("synced");
    } catch {
      queueEvent(event);
      setSyncState("offline");
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    async function flushQueue() {
      for (const event of readQueue()) {
        await send(event);
      }
    }
    window.addEventListener("online", flushQueue);
    void flushQueue();
    return () => window.removeEventListener("online", flushQueue);
  }, [enabled, send]);

  const completePractice = useCallback(
    (mode: StudyMode, score: number, total: number) =>
      send(
        createEvent({
          eventType: "practice_completed",
          lessonId,
          lessonVersion,
          mode,
          score,
          total,
          durationSeconds: elapsedSeconds(startedAt.current),
          reviews: [],
        }),
      ),
    [lessonId, lessonVersion, send],
  );

  const rateContent = useCallback(
    (mode: StudyMode, contentId: string, rating: ReviewRating) =>
      send(
        createEvent({
          eventType: "review_rated",
          lessonId,
          lessonVersion,
          mode,
          durationSeconds: elapsedSeconds(startedAt.current),
          reviews: [{ contentId, rating }],
        }),
      ),
    [lessonId, lessonVersion, send],
  );

  return { syncState, completePractice, rateContent };
}

function createEvent(
  input: Omit<LearningEventInput, "eventId" | "completedAt">,
): LearningEventInput {
  return {
    ...input,
    eventId: crypto.randomUUID(),
    completedAt: new Date().toISOString(),
  };
}

function elapsedSeconds(startedAt: number) {
  return Math.max(0, Math.round((Date.now() - startedAt) / 1000));
}

function readQueue(): LearningEventInput[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(queueKey) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    const limited = parsed.slice(-maxQueuedEvents);
    if (limited.length !== parsed.length) {
      localStorage.setItem(queueKey, JSON.stringify(limited));
    }
    return limited;
  } catch {
    return [];
  }
}

function queueEvent(event: LearningEventInput) {
  if (typeof localStorage === "undefined") return;
  const queued = readQueue();
  if (!queued.some((item) => item.eventId === event.eventId)) {
    localStorage.setItem(
      queueKey,
      JSON.stringify([...queued, event].slice(-maxQueuedEvents)),
    );
  }
}

function removeQueuedEvent(eventId: string) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(
    queueKey,
    JSON.stringify(readQueue().filter((event) => event.eventId !== eventId)),
  );
}
