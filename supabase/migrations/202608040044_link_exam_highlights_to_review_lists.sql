alter table public.exam_highlights
  add column if not exists review_list_id uuid references public.vocabulary_lists(id) on delete set null,
  add column if not exists review_saved_at timestamptz;

create index if not exists exam_highlights_review_list_idx
  on public.exam_highlights(user_id, review_list_id)
  where review_list_id is not null;
