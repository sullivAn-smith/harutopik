alter table public.lesson_progress
  add column if not exists completion_percent smallint not null default 0
    check (completion_percent between 0 and 100),
  add column if not exists progress_components jsonb not null default '{}'::jsonb
    check (jsonb_typeof(progress_components) = 'object'),
  add column if not exists speed_test_unlocked_at timestamptz;

comment on column public.lesson_progress.completion_percent is
  'Highest lesson completion percentage reached by the learner.';
comment on column public.lesson_progress.progress_components is
  'Best progress component snapshot used to explain lesson completion.';
comment on column public.lesson_progress.speed_test_unlocked_at is
  'Permanent timestamp granting access to lesson Speed Tests.';

update public.lesson_progress
set
  completion_percent = 100,
  progress_components = jsonb_build_object(
    'vocabulary', 100,
    'grammar', 100,
    'practice', 100,
    'accuracy', coalesce(best_score, 100)
  ),
  speed_test_unlocked_at = coalesce(
    speed_test_unlocked_at,
    completed_at,
    updated_at,
    now()
  )
where status = 'completed';

insert into public.lesson_progress (
  user_id,
  lesson_id,
  lesson_version,
  status,
  completion_percent,
  progress_components,
  speed_test_unlocked_at,
  last_studied_at,
  updated_at
)
select distinct on (attempt.user_id, attempt.source_id)
  attempt.user_id,
  attempt.source_id,
  1,
  'in_progress'::public.lesson_progress_status,
  100,
  jsonb_build_object('legacySpeedTestAccess', true),
  attempt.created_at,
  attempt.created_at,
  now()
from public.speed_test_attempts as attempt
where attempt.source_kind = 'lesson'
order by attempt.user_id, attempt.source_id, attempt.created_at
on conflict (user_id, lesson_id) do update
set
  completion_percent = greatest(
    public.lesson_progress.completion_percent,
    excluded.completion_percent
  ),
  speed_test_unlocked_at = coalesce(
    public.lesson_progress.speed_test_unlocked_at,
    excluded.speed_test_unlocked_at
  ),
  updated_at = now();

create or replace function public.preserve_lesson_progress_milestones()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.completion_percent > new.completion_percent then
    new.completion_percent := old.completion_percent;
    new.progress_components := old.progress_components;
  end if;

  new.speed_test_unlocked_at := coalesce(
    old.speed_test_unlocked_at,
    new.speed_test_unlocked_at
  );
  new.completed_at := coalesce(old.completed_at, new.completed_at);

  if old.status = 'completed' then
    new.status := 'completed';
  end if;

  return new;
end;
$$;

drop trigger if exists preserve_lesson_progress_milestones_before_update
on public.lesson_progress;

create trigger preserve_lesson_progress_milestones_before_update
before update on public.lesson_progress
for each row execute function public.preserve_lesson_progress_milestones();

create or replace function public.enforce_lesson_speed_test_unlock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.source_kind = 'lesson'
     and auth.role() <> 'service_role'
     and not exists (
       select 1
       from public.lesson_progress as progress
       where progress.user_id = new.user_id
         and progress.lesson_id = new.source_id
         and progress.speed_test_unlocked_at is not null
     )
  then
    raise exception 'SPEED_TEST_LOCKED';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_lesson_speed_test_unlock_before_insert
on public.speed_test_attempts;

create trigger enforce_lesson_speed_test_unlock_before_insert
before insert on public.speed_test_attempts
for each row execute function public.enforce_lesson_speed_test_unlock();

revoke all on function public.enforce_lesson_speed_test_unlock() from public;
revoke all on function public.preserve_lesson_progress_milestones() from public;
