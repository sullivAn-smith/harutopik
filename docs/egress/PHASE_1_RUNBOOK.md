# Egress optimization — Phase 1 runbook

Phase 1 adds measurement and regression guards only. It does not change production data fetching, caching, media delivery, or learner behavior.

## Baseline

The repository baseline is `docs/egress/baseline-2026-08-19.json`. Supabase Dashboard remains the billing source of truth because client-side JSON sizes do not include every protocol and service overhead.

Before each optimization phase, record these values from Supabase Dashboard → Usage for the same 24-hour and 7-day windows:

- Total Egress
- Database Egress
- Storage Egress
- Cached Egress
- request count and cache-hit status for the most requested Storage paths
- most frequent Database API queries and average returned rows

Do not commit screenshots containing project references, user identifiers, tokens, or signed URLs.

## Commands

Run the local, non-network budget check:

```bash
npm run check:egress-budget
```

Generate a fresh read-only production audit only when a comparison is required:

```bash
npm run audit:egress > /tmp/haru-egress-audit.json
EGRESS_AUDIT_FILE=/tmp/haru-egress-audit.json npm run check:egress-budget
```

The audit itself downloads database samples and lists Storage objects. Do not schedule it frequently because measurement also creates a small amount of egress.

## Learner contract smoke test

For every later phase, verify:

1. `/thu-vien/1` shows the same published books, modules, lesson titles, order, and locked state.
2. Opening a lesson while signed out preserves the exact `next` URL during login/registration.
3. A signed-in learner receives the same vocabulary, grammar, exercises, images, audio, and saved progress.
4. Draft and unpublished lessons never appear in learner catalog/API responses.
5. Publish makes a lesson visible without a redeploy; unpublish removes it.
6. Hotfixing vocabulary, image, or audio becomes visible without losing lesson content.
7. Flashcard, speed test, audio reaction, reference audio, and exam audio retain their current interaction behavior.
8. Desktop and mobile navigation remain usable.

## Known baseline findings

- On 2026-08-19, the full learner catalog cache value reached 2,673,328 bytes. Next.js rejected it because a Data Cache item cannot exceed 2 MB. Phase 2 must split the lightweight catalog metadata from full lesson content; increasing the limit or hiding the error is not an acceptable fix.
- The signed-out mobile header currently exposes `Đăng nhập`; the Phase 1 E2E contract follows the current UI rather than the stale expectation for a `Pro` link.

## Required verification

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run check:performance
npm run check:egress-budget
npm run test:e2e
```

## Release and rollback gate

- Deploy one phase at a time.
- Compare equivalent traffic windows; do not compare a weekday peak with a quiet weekend.
- Stop rollout on learner-visible content differences, authorization changes, stale publish/unpublish behavior, increased error rate, or slower audio start.
- Keep the previous deployment and any original Storage objects available until the observation window ends.
- Observe application errors immediately after deploy and compare egress after 24 hours; use 3–7 days for the final phase decision.
