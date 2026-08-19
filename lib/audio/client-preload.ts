export function releaseAudio(audio: HTMLAudioElement | null) {
  if (!audio) return;
  audio.pause();
  audio.removeAttribute("src");
  try {
    audio.load();
  } catch {
    // Some test/browser media implementations do not provide load().
  }
}

export function promoteAudioPreload(audio: HTMLAudioElement | null) {
  if (!audio || audio.preload === "auto") return;
  audio.preload = "auto";
  try {
    audio.load();
  } catch {
    // play() will still initiate the request when load() is unavailable.
  }
}
