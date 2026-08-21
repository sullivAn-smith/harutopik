-- Read-only indexes for the lesson/library critical path.
-- These indexes do not change rows, permissions, or learning semantics.

create index if not exists learning_events_lesson_progress_lookup_idx
on public.learning_events (
  user_id,
  lesson_id,
  lesson_version,
  event_type
);

create index if not exists review_cards_lesson_progress_lookup_idx
on public.review_cards (
  user_id,
  lesson_id,
  content_id
);

create index if not exists published_catalog_type_slug_lookup_idx
on public.published_catalog (
  content_type,
  slug
);
