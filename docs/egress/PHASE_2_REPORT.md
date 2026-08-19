# Egress optimization — Phase 2 report

## Outcome

Phase 2 separates lightweight course/lesson navigation metadata from full lesson content without changing the learner API contract.

- Production catalog measured on 2026-08-19: 1,839,661 JSON bytes for 66 rows.
- Equivalent shell projection: 41,434 JSON bytes for the same 66 rows.
- Projected Database Egress reduction for course-shelf reads: 97.75% per cache miss.
- Full lesson content remains loaded only for the requested lesson route.
- `/api/v1/catalog` still returns vocabulary, grammar, and exercises. Its internal Next.js cache value is gzip-compressed so it stays below the 2 MB Data Cache item limit.

## Rollout order

1. Apply `202608190080_create_lightweight_published_catalog_shells.sql`.
2. Run `npm run audit:egress` and confirm `publishedCatalogShells.available` is `true` and `jsonBytes` is below 131,072.
3. Deploy the application code.
4. Smoke-test home, library, signed-out lesson redirect, signed-in lesson content, and `/api/v1/catalog`.
5. Compare Database Egress after an equivalent 24-hour traffic window.

The application includes a temporary fallback to the full catalog if PostgREST reports that the new RPC is missing. This prevents downtime during rollout but does not provide the Phase 2 egress reduction until the migration is present.

## Production migration status

Migration `202608190080` was applied independently on 2026-08-19 through the linked Management API and recorded as applied in migration history. Unrelated pending migrations `202608170068`, `202608170069`, and `202608190077`–`079` were not executed.

Production verification returned 66 rows and 41,434 JSON bytes for both the anon and service-role clients. The committed post-migration audit is `docs/egress/post-phase-2-2026-08-19.json`.

Migration `077` should be reviewed separately before a future `--include-all` push: new attempts use the Monday of the week as `period_start`, while its historical backfill currently inserts the attempt's local calendar date.
