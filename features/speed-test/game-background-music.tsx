"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const musicSource = "/audio/game/background-game.mp3";
const enabledKey = "haru:game-background-music-enabled:v1";
const volumeKey = "haru:game-background-music-volume:v1";
const defaultVolume = 0.18;

export function useGameBackgroundMusic(active: boolean, source = musicSource) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      const stored = window.localStorage.getItem(enabledKey);
      return stored === null ? true : stored === "true";
    } catch { return true; }
  });
  const [volume, setVolumeState] = useState(() => {
    if (typeof window === "undefined") return defaultVolume;
    try {
      const stored = Number(window.localStorage.getItem(volumeKey));
      return Number.isFinite(stored) && stored >= 0 && stored <= 1 ? stored : defaultVolume;
    } catch { return defaultVolume; }
  });

  useEffect(() => {
    const audio = new Audio(source);
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = defaultVolume;
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      audioRef.current = null;
    };
  }, [source]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
    if (active && enabled) void audio.play().catch(() => undefined);
    else {
      audio.pause();
      if (!active) {
        try { audio.currentTime = 0; } catch { /* media may not be ready yet */ }
      }
    }
  }, [active, enabled, volume]);

  useEffect(() => {
    const onVisibilityChange = () => {
      const audio = audioRef.current;
      if (!audio) return;
      if (document.hidden) audio.pause();
      else if (active && enabled) void audio.play().catch(() => undefined);
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [active, enabled]);

  const playFromUserGesture = useCallback(() => {
    const audio = audioRef.current;
    if (audio && enabled) void audio.play().catch(() => undefined);
  }, [enabled]);

  const toggle = useCallback(() => {
    setEnabled((current) => {
      const next = !current;
      try { window.localStorage.setItem(enabledKey, String(next)); } catch { /* storage is optional */ }
      const audio = audioRef.current;
      if (!next) audio?.pause();
      else if (active && audio) void audio.play().catch(() => undefined);
      return next;
    });
  }, [active]);

  const setVolume = useCallback((next: number) => {
    const safe = Math.max(0, Math.min(1, next));
    setVolumeState(safe);
    if (audioRef.current) audioRef.current.volume = safe;
    try { window.localStorage.setItem(volumeKey, String(safe)); } catch { /* storage is optional */ }
  }, []);

  return { enabled, volume, toggle, setVolume, playFromUserGesture };
}

export function GameMusicControl({ enabled, volume, toggle, setVolume }: {
  enabled: boolean;
  volume: number;
  toggle: () => void;
  setVolume: (volume: number) => void;
}) {
  return <div className="fixed bottom-4 left-4 z-[70] flex items-center gap-2 rounded-full border border-white/30 bg-slate-950/85 p-2 text-white shadow-xl backdrop-blur-md">
    <button type="button" onClick={toggle} aria-label={enabled ? "Tắt nhạc nền" : "Bật nhạc nền"} title={enabled ? "Tắt nhạc nền" : "Bật nhạc nền"} className="grid size-10 place-items-center rounded-full bg-white/10 text-xl transition hover:bg-white/20">
      {enabled ? "🔊" : "🔇"}
    </button>
    <span className="hidden text-xs font-black uppercase tracking-wider sm:inline">Nhạc nền</span>
    <input aria-label="Âm lượng nhạc nền" type="range" min="0" max="100" value={Math.round(volume * 100)} onChange={(event) => setVolume(Number(event.target.value) / 100)} disabled={!enabled} className="w-20 accent-violet-400 disabled:opacity-40 sm:w-28" />
  </div>;
}
