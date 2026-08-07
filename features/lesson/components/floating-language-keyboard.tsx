"use client";

import { useEffect, useRef, useState } from "react";

type Language = "ko" | "vi";
type Editable = HTMLInputElement | HTMLTextAreaElement;
type KeyDefinition = { code: string; ko: string; koShift?: string; vi: string };
const keyboardSizeStorageKey = "harutopik:floating-keyboard-size:v1";

function readKeyboardSize() {
  const fallback = { width: 560, keyHeight: 40 };
  if (typeof window === "undefined") return fallback;
  try {
    const saved = JSON.parse(window.localStorage.getItem(keyboardSizeStorageKey) ?? "null") as { width?: number; keyHeight?: number } | null;
    if (!saved?.width || !saved?.keyHeight) return fallback;
    return {
      width: Math.min(760, Math.max(380, saved.width)),
      keyHeight: Math.min(60, Math.max(32, saved.keyHeight)),
    };
  } catch {
    window.localStorage.removeItem(keyboardSizeStorageKey);
    return fallback;
  }
}

const rows: KeyDefinition[][] = [
  [
    ["KeyQ", "ㅂ", "q", "ㅃ"], ["KeyW", "ㅈ", "w", "ㅉ"], ["KeyE", "ㄷ", "e", "ㄸ"],
    ["KeyR", "ㄱ", "r", "ㄲ"], ["KeyT", "ㅅ", "t", "ㅆ"], ["KeyY", "ㅛ", "y"],
    ["KeyU", "ㅕ", "u"], ["KeyI", "ㅑ", "i"], ["KeyO", "ㅐ", "o", "ㅒ"],
    ["KeyP", "ㅔ", "p", "ㅖ"],
  ],
  [
    ["KeyA", "ㅁ", "a"], ["KeyS", "ㄴ", "s"], ["KeyD", "ㅇ", "d"],
    ["KeyF", "ㄹ", "f"], ["KeyG", "ㅎ", "g"], ["KeyH", "ㅗ", "h"],
    ["KeyJ", "ㅓ", "j"], ["KeyK", "ㅏ", "k"], ["KeyL", "ㅣ", "l"],
  ],
  [
    ["KeyZ", "ㅋ", "z"], ["KeyX", "ㅌ", "x"], ["KeyC", "ㅊ", "c"],
    ["KeyV", "ㅍ", "v"], ["KeyB", "ㅠ", "b"], ["KeyN", "ㅜ", "n"],
    ["KeyM", "ㅡ", "m"],
  ],
].map((row) => row.map(([code, ko, vi, koShift]) => ({ code, ko, vi, koShift })));

const initials = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
const vowels = ["ㅏ", "ㅐ", "ㅑ", "ㅒ", "ㅓ", "ㅔ", "ㅕ", "ㅖ", "ㅗ", "ㅘ", "ㅙ", "ㅚ", "ㅛ", "ㅜ", "ㅝ", "ㅞ", "ㅟ", "ㅠ", "ㅡ", "ㅢ", "ㅣ"];
const finals = ["", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ", "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
const combinedVowels: Record<string, string> = { "ㅗㅏ": "ㅘ", "ㅗㅐ": "ㅙ", "ㅗㅣ": "ㅚ", "ㅜㅓ": "ㅝ", "ㅜㅔ": "ㅞ", "ㅜㅣ": "ㅟ", "ㅡㅣ": "ㅢ" };
const combinedFinals: Record<string, string> = { "ㄱㅅ": "ㄳ", "ㄴㅈ": "ㄵ", "ㄴㅎ": "ㄶ", "ㄹㄱ": "ㄺ", "ㄹㅁ": "ㄻ", "ㄹㅂ": "ㄼ", "ㄹㅅ": "ㄽ", "ㄹㅌ": "ㄾ", "ㄹㅍ": "ㄿ", "ㄹㅎ": "ㅀ", "ㅂㅅ": "ㅄ" };
const splitFinals: Record<string, [string, string]> = Object.fromEntries(
  Object.entries(combinedFinals).map(([parts, combined]) => [combined, [parts[0], parts[1]]]),
);

function syllable(initial: string, vowel: string, final = "") {
  return String.fromCharCode(0xac00 + initials.indexOf(initial) * 588 + vowels.indexOf(vowel) * 28 + finals.indexOf(final));
}

function decompose(character: string) {
  if (!character) return null;
  const code = character.charCodeAt(0) - 0xac00;
  if (!Number.isFinite(code) || code < 0 || code > 11171) return null;
  return {
    initial: initials[Math.floor(code / 588)],
    vowel: vowels[Math.floor((code % 588) / 28)],
    final: finals[code % 28],
  };
}

export function appendHangul(text: string, character: string) {
  const last = text.at(-1) ?? "";
  const prefix = text.slice(0, -1);
  const parts = decompose(last);
  if (vowels.includes(character)) {
    if (initials.includes(last)) return prefix + syllable(last, character);
    if (!parts) return text + character;
    if (!parts.final) {
      const combined = combinedVowels[parts.vowel + character];
      return combined ? prefix + syllable(parts.initial, combined) : text + character;
    }
    const split = splitFinals[parts.final];
    const remainingFinal = split?.[0] ?? "";
    const nextInitial = split?.[1] ?? parts.final;
    return prefix + syllable(parts.initial, parts.vowel, remainingFinal) + syllable(nextInitial, character);
  }
  if (!initials.includes(character) || !parts || parts.final) {
    if (parts?.final) {
      const combined = combinedFinals[parts.final + character];
      if (combined) return prefix + syllable(parts.initial, parts.vowel, combined);
    }
    return text + character;
  }
  return finals.includes(character)
    ? prefix + syllable(parts.initial, parts.vowel, character)
    : text + character;
}

const telexShapes: Record<string, string> = {
  aa: "â", aw: "ă", dd: "đ", ee: "ê", oo: "ô", ow: "ơ", uw: "ư",
};
const telexTones: Record<string, string> = {
  s: "\u0301", f: "\u0300", r: "\u0309", x: "\u0303", j: "\u0323",
};

export function appendVietnameseTelex(text: string, character: string) {
  if (character !== character.toLowerCase()) return text + character;
  const last = text.at(-1) ?? "";
  const shape = telexShapes[last.toLowerCase() + character];
  if (shape) {
    const result = last === last.toUpperCase() ? shape.toUpperCase() : shape;
    return text.slice(0, -1) + result;
  }
  const tone = telexTones[character];
  if (!tone) return text + character;
  const letters = Array.from(text);
  for (let index = letters.length - 1; index >= 0; index -= 1) {
    if (/\s/.test(letters[index])) break;
    if (!/[aăâeêioôơuưy]/i.test(letters[index])) continue;
    const base = letters[index]
      .normalize("NFD")
      .replace(/[\u0300\u0301\u0303\u0309\u0323]/g, "");
    letters[index] = (base + tone).normalize("NFC");
    return letters.join("");
  }
  return text + character;
}

function setEditableValue(target: Editable, value: string, caret: number) {
  const prototype = target instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(target, value);
  target.dispatchEvent(new Event("input", { bubbles: true }));
  target.focus();
  target.setSelectionRange(caret, caret);
}

export function FloatingLanguageKeyboard() {
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState<Language>("ko");
  const [shift, setShift] = useState(false);
  const [activeCodes, setActiveCodes] = useState<Set<string>>(new Set());
  const [position, setPosition] = useState({ x: 0, y: 92 });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [keyboardSize, setKeyboardSize] = useState(readKeyboardSize);
  const [draftSize, setDraftSize] = useState(readKeyboardSize);
  const keyboardRef = useRef<HTMLDivElement>(null);
  const editableRef = useRef<Editable | null>(null);
  const dragRef = useRef<{ pointerId: number; dx: number; dy: number } | null>(null);

  useEffect(() => {
    const placeAtRight = () => setPosition((current) => ({
      x: Math.max(12, Math.min(current.x || window.innerWidth - 590, window.innerWidth - 120)),
      y: Math.max(12, Math.min(current.y, window.innerHeight - 90)),
    }));
    placeAtRight();
    window.addEventListener("resize", placeAtRight);
    return () => window.removeEventListener("resize", placeAtRight);
  }, []);

  useEffect(() => {
    const rememberEditable = (event: FocusEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        if (!event.target.disabled && !event.target.readOnly) editableRef.current = event.target;
      }
    };
    const down = (event: KeyboardEvent) => setActiveCodes((current) => new Set(current).add(event.code));
    const up = (event: KeyboardEvent) => setActiveCodes((current) => {
      const next = new Set(current); next.delete(event.code); return next;
    });
    document.addEventListener("focusin", rememberEditable);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      document.removeEventListener("focusin", rememberEditable);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  function insert(value: string) {
    const target = editableRef.current;
    if (!target) return;
    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? start;
    const before = target.value.slice(0, start);
    const character = language === "vi" && shift ? value.toUpperCase() : value;
    const inserted = language === "ko"
      ? appendHangul(before, character)
      : appendVietnameseTelex(before, character);
    const next = inserted + target.value.slice(end);
    setEditableValue(target, next, inserted.length);
    setShift(false);
  }
  function erase() {
    const target = editableRef.current;
    if (!target) return;
    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? start;
    if (start === 0 && end === 0) return;
    const next = start === end
      ? target.value.slice(0, start - 1) + target.value.slice(end)
      : target.value.slice(0, start) + target.value.slice(end);
    const caret = start === end ? start - 1 : start;
    setEditableValue(target, next, caret);
  }
  function keyClass(code: string) {
    return `min-h-10 min-w-9 flex-1 rounded-lg border px-2 text-sm font-black shadow-sm transition ${
      activeCodes.has(code)
        ? "scale-95 border-cyan-300 bg-cyan-400 text-[#10243e] shadow-[0_0_18px_rgba(34,211,238,.8)]"
        : "border-slate-200 bg-white text-[#10243e] hover:bg-cyan-50"
    }`;
  }
  const visibleWidth = settingsOpen ? draftSize.width : keyboardSize.width;
  const visibleKeyHeight = settingsOpen ? draftSize.keyHeight : keyboardSize.keyHeight;

  function toggleSettings() {
    if (!settingsOpen) {
      setDraftSize(keyboardSize);
    }
    setSettingsOpen((value) => !value);
  }

  function saveKeyboardSize() {
    setKeyboardSize(draftSize);
    window.localStorage.setItem(
      keyboardSizeStorageKey,
      JSON.stringify(draftSize),
    );
    setSettingsOpen(false);
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="fixed bottom-5 right-5 z-40 rounded-2xl border border-white/80 bg-[#10243e] px-4 py-3 font-black text-white shadow-[0_14px_35px_rgba(16,36,62,.3)]" aria-label="Mở bàn phím Hàn Việt">
        ⌨ Hàn · Việt
      </button>
    );
  }
  return (
    <div ref={keyboardRef} className="fixed z-50 rounded-2xl border border-white/80 bg-slate-100/95 p-3 shadow-[0_22px_55px_rgba(16,36,62,.35)] backdrop-blur" style={{ left: position.x, top: position.y, width: `min(${visibleWidth}px, calc(100vw - 24px))` }}>
      <div
        className="mb-3 flex cursor-move touch-none items-center justify-between gap-2 rounded-xl bg-[#10243e] px-3 py-2 text-white"
        onPointerDown={(event) => {
          dragRef.current = { pointerId: event.pointerId, dx: event.clientX - position.x, dy: event.clientY - position.y };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (dragRef.current?.pointerId !== event.pointerId) return;
          const bounds = keyboardRef.current?.getBoundingClientRect();
          setPosition({
            x: Math.max(8, Math.min(event.clientX - dragRef.current.dx, window.innerWidth - (bounds?.width ?? 560) - 8)),
            y: Math.max(8, Math.min(event.clientY - dragRef.current.dy, window.innerHeight - (bounds?.height ?? 300) - 8)),
          });
        }}
        onPointerUp={(event) => {
          dragRef.current = null;
          event.currentTarget.releasePointerCapture(event.pointerId);
        }}
      >
        <strong>⋮⋮ Bàn phím Harutopik</strong>
        <div className="flex items-center gap-1">
          <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={toggleSettings} className="grid h-8 w-8 place-items-center rounded-full bg-white/15" aria-label="Tùy chỉnh kích thước bàn phím">⚙</button>
          <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg border border-white/45 bg-rose-500/90 text-sm font-black text-white shadow-[0_3px_9px_rgba(244,63,94,.35)] transition hover:bg-rose-400" aria-label="Thu gọn bàn phím">X</button>
        </div>
      </div>
      {settingsOpen && (
        <div className="mb-3 grid gap-3 rounded-xl border border-cyan-100 bg-white p-3 sm:grid-cols-2">
          <label className="text-xs font-black text-slate-600">
            Chiều rộng · {draftSize.width}px
            <input type="range" min="380" max="760" step="20" value={draftSize.width} onChange={(event) => setDraftSize((current) => ({ ...current, width: Number(event.target.value) }))} className="mt-2 w-full accent-cyan-600" />
          </label>
          <label className="text-xs font-black text-slate-600">
            Chiều cao phím · {draftSize.keyHeight}px
            <input type="range" min="32" max="60" step="2" value={draftSize.keyHeight} onChange={(event) => setDraftSize((current) => ({ ...current, keyHeight: Number(event.target.value) }))} className="mt-2 w-full accent-cyan-600" />
          </label>
          <button type="button" onClick={saveKeyboardSize} className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-black text-white sm:col-span-2">
            Lưu kích thước
          </button>
        </div>
      )}
      <div className="mb-3 flex gap-2">
        {(["ko", "vi"] as const).map((item) => (
          <button key={item} type="button" onClick={() => setLanguage(item)} className={`flex-1 rounded-lg px-3 py-2 text-sm font-black ${language === item ? "bg-cyan-500 text-white" : "bg-white text-slate-600"}`}>
            {item === "ko" ? "한국어" : "Tiếng Việt"}
          </button>
        ))}
      </div>
      <div className="space-y-1.5" onPointerDown={(event) => event.preventDefault()}>
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex justify-center gap-1.5">
            {row.map((key) => (
              <button key={key.code} type="button" style={{ minHeight: visibleKeyHeight }} className={keyClass(key.code)} onClick={() => insert(language === "ko" ? (shift && key.koShift ? key.koShift : key.ko) : key.vi)}>
                {language === "ko" ? (shift && key.koShift ? key.koShift : key.ko) : (shift ? key.vi.toUpperCase() : key.vi)}
              </button>
            ))}
            {rowIndex === 0 && (
              <button type="button" style={{ minHeight: visibleKeyHeight }} onClick={erase} className={`${keyClass("Backspace")} min-w-20 max-w-24 text-xl`} aria-label="Xóa ký tự">←</button>
            )}
          </div>
        ))}
        <div className="flex gap-1.5">
          <button type="button" style={{ minHeight: visibleKeyHeight }} onClick={() => setShift((value) => !value)} className={`${keyClass("ShiftLeft")} max-w-20 ${shift ? "!bg-cyan-200" : ""}`}>⇧</button>
          <button type="button" style={{ minHeight: visibleKeyHeight }} onClick={() => insert(" ")} className={`${keyClass("Space")} flex-[4]`} aria-label="Phím cách" />
          <button type="button" style={{ minHeight: visibleKeyHeight }} onClick={() => insert("\n")} className={`${keyClass("Enter")} max-w-20`}>↵</button>
        </div>
      </div>
      <p className="mt-2 text-center text-[11px] font-bold text-slate-500">Chạm ô cần nhập trước · Kéo thanh tiêu đề để di chuyển</p>
    </div>
  );
}
