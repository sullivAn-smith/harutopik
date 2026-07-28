"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  studySessionStateSchema,
  type StudySessionState,
} from "@/lib/learning-core/study-session-schema";

type SessionSyncState =
  | "idle"
  | "saving"
  | "saved"
  | "offline";

type UseStudySessionOptions = {
  lessonId: string;
  lessonVersion: number;
  state: StudySessionState;
  onRestore: (state: StudySessionState) => void;
  enabled?: boolean;
};

const remoteDelayMs = 900;

export function useStudySession({
  lessonId,
  lessonVersion,
  state,
  onRestore,
  enabled = true,
}: UseStudySessionOptions) {
  const localKey = `harutopik:study-session:v1:${lessonId}:${lessonVersion}`;
  const [syncState, setSyncState] = useState<SessionSyncState>("idle");
  const [restored, setRestored] = useState(false);
  const readyRef = useRef(false);
  const remoteCheckedRef = useRef(false);
  const changedAfterRestoreRef = useRef(false);
  const restoreFingerprintRef = useRef(fingerprint(state));
  const skipInitialStateEffectRef = useRef(true);
  const remoteTimerRef = useRef<number | null>(null);
  const latestPayloadRef = useRef(state);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    async function restore() {
      const local = readLocalSession(localKey);
      if (local) {
        restoreFingerprintRef.current = fingerprint(local);
        onRestore(local);
        setRestored(true);
      }
      readyRef.current = true;

      const remote = await readRemoteSession(lessonId, lessonVersion);
      if (cancelled) return;
      remoteCheckedRef.current = true;

      const remoteIsNewer =
        remote &&
        (!local ||
          new Date(remote.updatedAt).getTime() >
            new Date(local.updatedAt).getTime());
      if (remoteIsNewer && !changedAfterRestoreRef.current) {
        restoreFingerprintRef.current = fingerprint(remote);
        onRestore(remote);
        setRestored(true);
        return;
      }

      void saveRemoteSession(
        lessonId,
        lessonVersion,
        latestPayloadRef.current,
      );
    }

    void restore();
    return () => {
      cancelled = true;
    };
  }, [enabled, lessonId, lessonVersion, localKey, onRestore]);

  useEffect(() => {
    if (!enabled) return;
    latestPayloadRef.current = state;
    if (!readyRef.current) return;
    if (skipInitialStateEffectRef.current) {
      skipInitialStateEffectRef.current = false;
      return;
    }

    localStorage.setItem(localKey, JSON.stringify(state));
    if (fingerprint(state) !== restoreFingerprintRef.current) {
      changedAfterRestoreRef.current = true;
    }
    if (!remoteCheckedRef.current) return;

    setSyncState("saving");

    if (remoteTimerRef.current !== null) {
      window.clearTimeout(remoteTimerRef.current);
    }
    remoteTimerRef.current = window.setTimeout(async () => {
      const saved = await saveRemoteSession(
        lessonId,
        lessonVersion,
        latestPayloadRef.current,
      );
      setSyncState(saved ? "saved" : "offline");
      remoteTimerRef.current = null;
    }, remoteDelayMs);

    return () => {
      if (remoteTimerRef.current !== null) {
        window.clearTimeout(remoteTimerRef.current);
      }
    };
  }, [enabled, lessonId, lessonVersion, localKey, state]);

  useEffect(() => {
    if (!enabled) return;
    function flushBeforeLeaving() {
      if (!readyRef.current) return;
      localStorage.setItem(localKey, JSON.stringify(latestPayloadRef.current));
    }
    window.addEventListener("pagehide", flushBeforeLeaving);
    return () => window.removeEventListener("pagehide", flushBeforeLeaving);
  }, [enabled, localKey]);

  const clearSession = useCallback(async () => {
    if (!enabled) return;
    localStorage.removeItem(localKey);
    setRestored(false);
    await fetch(
      `/api/v1/learning/session?lessonId=${encodeURIComponent(lessonId)}`,
      { method: "DELETE" },
    ).catch(() => null);
  }, [enabled, lessonId, localKey]);

  return {
    syncState,
    restored,
    dismissRestoreNotice: () => setRestored(false),
    clearSession,
  };
}

function readLocalSession(key: string) {
  try {
    const parsed = studySessionStateSchema.safeParse(
      JSON.parse(localStorage.getItem(key) ?? "null"),
    );
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

async function readRemoteSession(lessonId: string, lessonVersion: number) {
  try {
    const query = new URLSearchParams({
      lessonId,
      lessonVersion: String(lessonVersion),
    });
    const response = await fetch(`/api/v1/learning/session?${query}`);
    if (!response.ok) return null;
    const payload = await response.json();
    const parsed = studySessionStateSchema.safeParse(
      payload.data?.session?.state,
    );
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

async function saveRemoteSession(
  lessonId: string,
  lessonVersion: number,
  state: StudySessionState,
) {
  try {
    const response = await fetch("/api/v1/learning/session", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lessonId, lessonVersion, state }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function fingerprint(state: StudySessionState) {
  return JSON.stringify({ ...state, updatedAt: "" });
}
