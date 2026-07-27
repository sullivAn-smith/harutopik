create table public.study_sessions (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text not null,
  lesson_version integer not null check (lesson_version > 0),
  mode text not null check (
    mode in ('flashcard', 'quiz', 'typing', 'matching', 'dictation', 'translation')
  ),
  state jsonb not null,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create index study_sessions_user_updated_idx
  on public.study_sessions (user_id, updated_at desc);

alter table public.study_sessions enable row level security;

create policy "Learners read their own study sessions"
on public.study_sessions for select
using ((select auth.uid()) = user_id);

create policy "Learners create their own study sessions"
on public.study_sessions for insert
with check ((select auth.uid()) = user_id);

create policy "Learners update their own study sessions"
on public.study_sessions for update
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Learners delete their own study sessions"
on public.study_sessions for delete
using ((select auth.uid()) = user_id);
