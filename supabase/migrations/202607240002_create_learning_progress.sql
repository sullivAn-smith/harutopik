create type public.lesson_progress_status as enum (
  'not_started',
  'in_progress',
  'completed'
);

create type public.review_state as enum ('new', 'learning', 'review');

create table public.learning_events (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('practice_completed', 'review_rated')),
  lesson_id text not null,
  lesson_version integer not null check (lesson_version > 0),
  mode text not null,
  score integer,
  total integer,
  duration_seconds integer not null check (duration_seconds between 0 and 86400),
  completed_at timestamptz not null,
  received_at timestamptz not null default now(),
  constraint valid_score check (
    (score is null and total is null)
    or (score >= 0 and total > 0 and score <= total)
  )
);

create table public.lesson_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text not null,
  lesson_version integer not null check (lesson_version > 0),
  status public.lesson_progress_status not null default 'not_started',
  best_score smallint check (best_score between 0 and 100),
  last_studied_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table public.review_cards (
  user_id uuid not null references auth.users(id) on delete cascade,
  content_id text not null,
  lesson_id text not null,
  state public.review_state not null default 'new',
  difficulty real not null default 5 check (difficulty between 1 and 10),
  stability_days real not null default 0 check (stability_days >= 0),
  interval_days integer not null default 0 check (interval_days >= 0),
  reps integer not null default 0 check (reps >= 0),
  lapses integer not null default 0 check (lapses >= 0),
  due_at timestamptz not null default now(),
  last_reviewed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, content_id)
);

create index learning_events_user_completed_idx
  on public.learning_events (user_id, completed_at desc);
create index lesson_progress_user_status_idx
  on public.lesson_progress (user_id, status);
create index review_cards_due_idx
  on public.review_cards (user_id, due_at)
  where state in ('learning', 'review');

alter table public.learning_events enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.review_cards enable row level security;

create policy "Learners manage their own learning events"
on public.learning_events for all
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Learners manage their own lesson progress"
on public.lesson_progress for all
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Learners manage their own review cards"
on public.review_cards for all
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
