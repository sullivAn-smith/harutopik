# Egress optimization — Phase 5 report

## Production findings

The audio inventory at the Phase 1 baseline was:

- `vocabulary-audio`: 3,416 objects, 63,206,352 bytes total, largest object 54,864 bytes.
- `exam-audio`: 28 objects, 35,575,541 bytes total, largest object 3,810,044 bytes.

The vocabulary files are already small MP3 files (about 18.5 KB on average), so transcoding them would create migration risk for little useful saving. The larger exam recordings benefit more from request lifecycle and Range support than from lowering audio quality.

Production checks on 2026-08-19 confirmed:

- Normal audio `GET` responses return `Cache-Control: public, max-age=31536000`.
- Repeated normal `GET` requests were served with `cf-cache-status: HIT`.
- Byte-range requests return `206 Partial Content`, `Accept-Ranges: bytes`, and only the requested bytes.
- `HEAD` and partial-range responses can report `Cache-Control: no-cache`; this is not representative of a normal browser media `GET`. The full `GET` and Storage object metadata both confirmed the one-year browser TTL.
- Existing upload paths for both `vocabulary-audio` and `exam-audio` already set `cacheControl: "31536000"`.

No Storage rewrite is needed. Re-uploading unchanged audio solely to change metadata would itself consume egress and invalidate working CDN entries.

## Implemented changes

The Speed Test audio-reaction lifecycle now:

1. Keeps the current question at `preload="auto"`, preserving startup behavior.
2. Creates the next audio with `preload="none"` so it cannot consume data before the current question actually plays.
3. Promotes the next audio to `auto` on the current audio's `playing` event, using listening/answer time to preload without adding a pause between questions.
4. Reuses that prefetched media element for the next question instead of creating a duplicate request.
5. Pauses, detaches the source, and calls `load()` to abort/release media requests on retry, game completion, and unmount.
6. Leaves Flash Reaction unchanged because it does not use audio.

The exam runner was deliberately not changed: it already uses one shared audio element with `preload="metadata"` and only assigns a question URL after the learner presses play. Exam result audio uses `preload="none"`. These are already egress-efficient and preserve listening limits.

## Expected effect

- No audio quality reduction.
- No feature or listening-limit changes.
- No additional delay for the current question.
- Eliminates duplicate current/next media objects in Audio Reaction.
- Avoids downloading the next word when autoplay fails or the learner leaves before playback starts.
- Frees in-flight media requests and browser resources immediately when gameplay ends.

The exact billed-byte reduction depends on abandonment rate, autoplay failures, browser cache state, and Supabase CDN hit rate. Supabase Usage remains the source of truth; compare Storage egress over equivalent 7-day windows after deployment.

## Verification

- Unit tests cover preload promotion and media-source release.
- Existing Audio Reaction setup behavior remains covered.
- TypeScript validation passes.
