create type public.speed_test_direction as enum ('vi_ko', 'ko_vi');
create type public.speed_test_result as enum ('correct', 'wrong', 'near_miss');
create type public.speed_test_finish_reason as enum ('completed', 'timed_out');
create type public.word_mastery_status as enum ('new', 'learning', 'familiar', 'mastered');

create table public.speed_test_attempts (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  list_id uuid references public.vocabulary_lists(id) on delete set null,
  list_name text not null check (char_length(trim(list_name)) between 1 and 60),
  source_kind text not null default 'list' check (source_kind in ('list','lesson')),
  source_id text not null,
  direction public.speed_test_direction not null,
  requested_question_count text not null check (requested_question_count in ('10','20','30','all')),
  total_questions integer not null check (total_questions between 1 and 500),
  answered_count integer not null check (answered_count between 0 and total_questions),
  correct_count integer not null check (correct_count between 0 and answered_count),
  wrong_count integer not null check (wrong_count between 0 and answered_count),
  near_miss_count integer not null default 0 check (near_miss_count between 0 and answered_count),
  accuracy numeric(5,2) not null check (accuracy between 0 and 100),
  starting_seconds integer not null check (starting_seconds between 1 and 300),
  remaining_seconds integer not null check (remaining_seconds between 0 and 300),
  best_combo integer not null default 0 check (best_combo between 0 and 500),
  rating text not null check (rating in ('S+','A+','A','B','C','D')),
  finish_reason public.speed_test_finish_reason not null,
  rules_version integer not null default 1 check (rules_version > 0),
  question_ids text[] not null default '{}',
  started_at timestamptz not null,
  finished_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (finished_at >= started_at),
  check (correct_count + wrong_count + near_miss_count = answered_count)
);

create table public.speed_test_answers (
  id bigint generated always as identity primary key,
  attempt_id uuid not null references public.speed_test_attempts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  vocabulary_id text not null,
  direction public.speed_test_direction not null,
  prompt_snapshot text not null,
  expected_answer_snapshot text not null,
  user_answer text not null default '',
  result public.speed_test_result not null,
  response_time_ms integer not null check (response_time_ms between 0 and 600000),
  position integer not null check (position between 1 and 500),
  time_before integer not null check (time_before between 0 and 300),
  time_after integer not null check (time_after between 0 and 300),
  created_at timestamptz not null default now(),
  unique (attempt_id, position),
  unique (attempt_id, vocabulary_id)
);

create table public.user_word_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  vocabulary_id text not null,
  correct_count integer not null default 0 check (correct_count >= 0),
  wrong_count integer not null default 0 check (wrong_count >= 0),
  near_miss_count integer not null default 0 check (near_miss_count >= 0),
  total_response_time_ms bigint not null default 0 check (total_response_time_ms >= 0),
  average_response_time_ms integer not null default 0 check (average_response_time_ms >= 0),
  current_correct_streak integer not null default 0 check (current_correct_streak >= 0),
  mastery_score numeric(5,2) not null default 0 check (mastery_score between 0 and 100),
  mastery_status public.word_mastery_status not null default 'new',
  last_seen_at timestamptz,
  last_correct_at timestamptz,
  last_wrong_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, vocabulary_id)
);

create index speed_test_attempts_user_created_idx on public.speed_test_attempts(user_id, created_at desc);
create index speed_test_answers_user_word_idx on public.speed_test_answers(user_id, vocabulary_id, created_at desc);
create index user_word_progress_weak_idx on public.user_word_progress(user_id, mastery_score, last_wrong_at desc);

alter table public.speed_test_attempts enable row level security;
alter table public.speed_test_answers enable row level security;
alter table public.user_word_progress enable row level security;

create policy "Learners read own speed attempts" on public.speed_test_attempts for select using ((select auth.uid()) = user_id);
create policy "Learners read own speed answers" on public.speed_test_answers for select using ((select auth.uid()) = user_id);
create policy "Learners read own word progress" on public.user_word_progress for select using ((select auth.uid()) = user_id);

grant select on public.speed_test_attempts, public.speed_test_answers, public.user_word_progress to authenticated;
grant all privileges on public.speed_test_attempts, public.speed_test_answers, public.user_word_progress to service_role;

create or replace function public.save_speed_test_result(
  p_attempt jsonb,
  p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  attempt_id uuid := (p_attempt->>'id')::uuid;
  answer jsonb;
  progress public.user_word_progress;
  attempts_count integer;
  mastery numeric;
  mastery_state public.word_mastery_status;
begin
  if actor_id is null then raise exception 'UNAUTHENTICATED'; end if;
  if jsonb_typeof(p_answers) <> 'array' then raise exception 'INVALID_ANSWERS'; end if;
  if exists (select 1 from public.speed_test_attempts where id = attempt_id) then
    raise exception 'ATTEMPT_EXISTS';
  end if;

  insert into public.speed_test_attempts (
    id,user_id,list_id,list_name,source_kind,source_id,direction,requested_question_count,total_questions,
    answered_count,correct_count,wrong_count,near_miss_count,accuracy,starting_seconds,
    remaining_seconds,best_combo,rating,finish_reason,rules_version,question_ids,
    started_at,finished_at
  ) values (
    attempt_id,actor_id,nullif(p_attempt->>'listId','')::uuid,p_attempt->>'listName',
    p_attempt->>'sourceKind',p_attempt->>'sourceId',
    (p_attempt->>'direction')::public.speed_test_direction,p_attempt->>'requestedQuestionCount',
    (p_attempt->>'totalQuestions')::integer,(p_attempt->>'answeredCount')::integer,
    (p_attempt->>'correctCount')::integer,(p_attempt->>'wrongCount')::integer,
    (p_attempt->>'nearMissCount')::integer,(p_attempt->>'accuracy')::numeric,
    (p_attempt->>'startingSeconds')::integer,(p_attempt->>'remainingSeconds')::integer,
    (p_attempt->>'bestCombo')::integer,p_attempt->>'rating',
    (p_attempt->>'finishReason')::public.speed_test_finish_reason,
    (p_attempt->>'rulesVersion')::integer,
    array(select jsonb_array_elements_text(p_attempt->'questionIds')),
    (p_attempt->>'startedAt')::timestamptz,(p_attempt->>'finishedAt')::timestamptz
  );

  for answer in select * from jsonb_array_elements(p_answers)
  loop
    insert into public.speed_test_answers (
      attempt_id,user_id,vocabulary_id,direction,prompt_snapshot,expected_answer_snapshot,
      user_answer,result,response_time_ms,position,time_before,time_after
    ) values (
      attempt_id,actor_id,answer->>'vocabularyId',
      (p_attempt->>'direction')::public.speed_test_direction,answer->>'prompt',
      answer->>'expectedAnswer',coalesce(answer->>'userAnswer',''),
      (answer->>'result')::public.speed_test_result,(answer->>'responseTimeMs')::integer,
      (answer->>'position')::integer,(answer->>'timeBefore')::integer,(answer->>'timeAfter')::integer
    );

    insert into public.user_word_progress(user_id,vocabulary_id)
    values (actor_id,answer->>'vocabularyId')
    on conflict (user_id,vocabulary_id) do nothing;

    select * into progress from public.user_word_progress
    where user_id = actor_id and vocabulary_id = answer->>'vocabularyId' for update;
    attempts_count := progress.correct_count + progress.wrong_count + progress.near_miss_count + 1;
    mastery := round(100 * (
      (progress.correct_count + case when answer->>'result' = 'correct' then 1 else 0 end)::numeric
      / greatest(1, attempts_count)
    ), 2);
    mastery_state := case
      when attempts_count < 2 then 'learning'::public.word_mastery_status
      when mastery >= 85 and attempts_count >= 5 then 'mastered'::public.word_mastery_status
      when mastery >= 65 and attempts_count >= 3 then 'familiar'::public.word_mastery_status
      else 'learning'::public.word_mastery_status
    end;

    update public.user_word_progress set
      correct_count = correct_count + case when answer->>'result' = 'correct' then 1 else 0 end,
      wrong_count = wrong_count + case when answer->>'result' = 'wrong' then 1 else 0 end,
      near_miss_count = near_miss_count + case when answer->>'result' = 'near_miss' then 1 else 0 end,
      total_response_time_ms = total_response_time_ms + (answer->>'responseTimeMs')::integer,
      average_response_time_ms = (total_response_time_ms + (answer->>'responseTimeMs')::integer) / attempts_count,
      current_correct_streak = case when answer->>'result' = 'correct' then current_correct_streak + 1 else 0 end,
      mastery_score = mastery,
      mastery_status = mastery_state,
      last_seen_at = (p_attempt->>'finishedAt')::timestamptz,
      last_correct_at = case when answer->>'result' = 'correct' then (p_attempt->>'finishedAt')::timestamptz else last_correct_at end,
      last_wrong_at = case when answer->>'result' <> 'correct' then (p_attempt->>'finishedAt')::timestamptz else last_wrong_at end,
      updated_at = now()
    where user_id = actor_id and vocabulary_id = answer->>'vocabularyId';
  end loop;

  return jsonb_build_object('saved', true, 'attemptId', attempt_id);
end;
$$;

revoke all on function public.save_speed_test_result(jsonb,jsonb) from public;
grant execute on function public.save_speed_test_result(jsonb,jsonb) to authenticated;
