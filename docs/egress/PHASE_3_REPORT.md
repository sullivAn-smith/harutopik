# Egress optimization — Phase 3 report

## Outcome

Published learning content now uses a 24-hour safety TTL instead of a five-minute polling interval. All existing publish, unpublish, lesson hotfix, vocabulary hotfix, image update, and audio update paths continue to expire `published-learning-content` immediately with `{ expire: 0 }`.

For unchanged content, the safety refresh frequency falls from up to 288 times per day to once per day per cache instance. Event-driven invalidation still refreshes content after an editorial change.

## Reference library

`/kien-thuc` is now statically rendered with a one-day revalidation interval. Its list query fetches only set summaries; opening `/kien-thuc/[slug]` queries and caches only the selected set and its items.

Production measurement on 2026-08-19:

- 2 published reference sets and 33 items.
- Previous list read: 7,392 compact JSON bytes.
- New summary read: 412 compact JSON bytes.
- List-query payload reduction: 94.43%.
- One detail set (`so-thuan-han`): 4,124 compact JSON bytes.

## Experience safeguards

- `/api/v1/catalog` continues returning full lesson vocabulary, grammar, and exercises.
- Lesson-level data retains immediate invalidation after publish/unpublish/hotfix.
- E2E covers the reference list and detail navigation on desktop and mobile.
- The one-day TTL is a fallback for missed external/manual database edits; normal application edits use event invalidation.
