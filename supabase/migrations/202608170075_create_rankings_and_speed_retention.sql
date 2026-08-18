alter table public.learner_profiles
  add column if not exists leaderboard_opt_in boolean not null default true;

alter table public.speed_test_attempts
  add column if not exists is_ranked boolean not null default false,
  add column if not exists ranking_date date,
  add column if not exists ranking_period_start date;

alter table public.speed_test_attempts
  drop constraint if exists speed_test_attempts_ranking_dates_check;

alter table public.speed_test_attempts
  add constraint speed_test_attempts_ranking_dates_check check (
    (is_ranked and ranking_date is not null and ranking_period_start is not null)
    or (not is_ranked and ranking_date is null and ranking_period_start is null)
  );

alter table public.user_word_progress
  add column if not exists korean_snapshot text,
  add column if not exists vietnamese_snapshot text,
  add column if not exists lesson_id_snapshot text;

create table public.speed_test_user_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  total_attempts bigint not null default 0 check (total_attempts >= 0),
  completed_attempts bigint not null default 0 check (completed_attempts >= 0),
  accuracy_sum numeric not null default 0 check (accuracy_sum >= 0),
  best_accuracy numeric(5,2) not null default 0 check (best_accuracy between 0 and 100),
  best_combo integer not null default 0 check (best_combo >= 0),
  best_remaining_seconds integer not null default 0 check (best_remaining_seconds >= 0),
  perfect_tests bigint not null default 0 check (perfect_tests >= 0),
  has_consistent boolean not null default false,
  has_speed_demon boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.speed_test_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  record_key text not null,
  game_type text not null,
  source_kind text not null,
  source_id text not null,
  difficulty_level text not null default '',
  reaction_direction text not null default '',
  answer_mode text not null default '',
  requested_question_count text not null,
  scoring_version integer not null,
  highest_score integer not null default 0 check (highest_score >= 0),
  best_accuracy numeric(5,2) not null default 0 check (best_accuracy between 0 and 100),
  best_combo integer not null default 0 check (best_combo >= 0),
  fastest_time_ms integer,
  best_remaining_seconds integer not null default 0 check (best_remaining_seconds >= 0),
  achieved_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, record_key)
);

create index speed_test_records_lookup_idx
  on public.speed_test_records (
    user_id, game_type, source_id, difficulty_level,
    reaction_direction, answer_mode, requested_question_count
  );

create table public.speed_test_ranked_daily_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  game_type text not null check (
    game_type in ('typing_sprint','audio_reaction','flash_reaction','card_reaction')
  ),
  ranking_date date not null,
  attempt_count smallint not null default 0 check (attempt_count between 0 and 3),
  updated_at timestamptz not null default now(),
  primary key (user_id, game_type, ranking_date)
);

create table public.speed_test_ranking_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  game_type text not null check (
    game_type in ('typing_sprint','audio_reaction','flash_reaction','card_reaction')
  ),
  period_start date not null,
  rank_score integer not null check (rank_score >= 0),
  raw_score integer not null default 0 check (raw_score >= 0),
  accuracy numeric(5,2) not null check (accuracy between 0 and 100),
  best_combo integer not null default 0 check (best_combo >= 0),
  duration_ms integer not null default 0 check (duration_ms >= 0),
  attempt_id uuid,
  source_id text not null,
  achieved_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, game_type, period_start)
);

create index speed_test_ranking_top_idx
  on public.speed_test_ranking_records (
    game_type, period_start, rank_score desc, accuracy desc,
    duration_ms asc, achieved_at asc
  );

create table public.exam_user_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id uuid not null references public.exam_sets(id) on delete cascade,
  best_score integer not null check (best_score >= 0),
  max_score integer not null check (max_score > 0),
  best_percentage numeric(6,3) not null check (best_percentage between 0 and 100),
  correct_count integer not null default 0 check (correct_count >= 0),
  total_questions integer not null check (total_questions > 0),
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  attempt_id uuid,
  achieved_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, exam_id)
);

create index exam_user_records_exam_rank_idx
  on public.exam_user_records (
    exam_id, best_percentage desc, correct_count desc,
    duration_seconds asc, achieved_at asc
  );

alter table public.speed_test_user_stats enable row level security;
alter table public.speed_test_records enable row level security;
alter table public.speed_test_ranked_daily_usage enable row level security;
alter table public.speed_test_ranking_records enable row level security;
alter table public.exam_user_records enable row level security;

create policy "Learners read own speed stats"
on public.speed_test_user_stats for select
using ((select auth.uid()) = user_id);

create policy "Learners read own speed records"
on public.speed_test_records for select
using ((select auth.uid()) = user_id);

create policy "Learners read own ranked usage"
on public.speed_test_ranked_daily_usage for select
using ((select auth.uid()) = user_id);

create policy "Learners read own speed ranking record"
on public.speed_test_ranking_records for select
using ((select auth.uid()) = user_id);

create policy "Learners read own exam records"
on public.exam_user_records for select
using ((select auth.uid()) = user_id);

grant select on public.speed_test_user_stats, public.speed_test_records,
  public.speed_test_ranked_daily_usage, public.speed_test_ranking_records,
  public.exam_user_records to authenticated;

grant all privileges on public.speed_test_user_stats, public.speed_test_records,
  public.speed_test_ranked_daily_usage, public.speed_test_ranking_records,
  public.exam_user_records to service_role;

insert into public.speed_test_user_stats (
  user_id, total_attempts, completed_attempts, accuracy_sum,
  best_accuracy, best_combo, best_remaining_seconds, perfect_tests,
  has_consistent, has_speed_demon, updated_at
)
select
  attempts.user_id,
  count(*),
  count(*) filter (where attempts.finish_reason = 'completed'),
  sum(attempts.accuracy),
  max(attempts.accuracy),
  max(attempts.best_combo),
  coalesce(
    max(attempts.remaining_seconds) filter (
      where attempts.finish_reason = 'completed'
    ),
    0
  ),
  count(*) filter (
    where attempts.finish_reason = 'completed' and attempts.accuracy = 100
  ),
  false,
  bool_or(
    attempts.finish_reason = 'completed'
    and attempts.total_questions >= 30
    and attempts.remaining_seconds >= 60
  ),
  now()
from public.speed_test_attempts as attempts
group by attempts.user_id
on conflict (user_id) do nothing;

update public.speed_test_user_stats as stats
set has_consistent = exists (
  select 1
  from (
    select attempt.accuracy
    from public.speed_test_attempts as attempt
    where attempt.user_id = stats.user_id
    order by attempt.created_at desc, attempt.id desc
    limit 3
  ) as recent
  having count(*) = 3 and min(recent.accuracy) >= 90
);

create or replace function public.speed_test_record_key(attempt public.speed_test_attempts)
returns text
language sql
immutable
set search_path = ''
as $$
  select concat_ws(
    '|',
    attempt.game_type,
    attempt.source_kind,
    attempt.source_id,
    coalesce(attempt.difficulty_level, ''),
    coalesce(attempt.reaction_direction, ''),
    coalesce(attempt.answer_mode, ''),
    attempt.requested_question_count,
    attempt.scoring_version::text
  );
$$;

create or replace function public.upsert_speed_test_record()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  key text;
  completed_time integer;
begin
  if new.game_type = 'flash_reaction'
    and (new.difficulty_level is null or new.reaction_direction is null)
  then
    return new;
  end if;

  key := public.speed_test_record_key(new);
  completed_time := case
    when new.finish_reason = 'completed' and new.total_time_ms > 0
      then new.total_time_ms
    else null
  end;

  insert into public.speed_test_records (
    user_id, record_key, game_type, source_kind, source_id,
    difficulty_level, reaction_direction, answer_mode,
    requested_question_count, scoring_version, highest_score,
    best_accuracy, best_combo, fastest_time_ms,
    best_remaining_seconds, achieved_at, updated_at
  ) values (
    new.user_id, key, new.game_type, new.source_kind, new.source_id,
    coalesce(new.difficulty_level, ''), coalesce(new.reaction_direction, ''),
    coalesce(new.answer_mode, ''), new.requested_question_count,
    new.scoring_version, new.score, new.accuracy, new.best_combo,
    completed_time,
    case when new.finish_reason = 'completed' then new.remaining_seconds else 0 end,
    new.finished_at, now()
  )
  on conflict (user_id, record_key) do update set
    highest_score = greatest(
      public.speed_test_records.highest_score,
      excluded.highest_score
    ),
    best_accuracy = greatest(
      public.speed_test_records.best_accuracy,
      excluded.best_accuracy
    ),
    best_combo = greatest(
      public.speed_test_records.best_combo,
      excluded.best_combo
    ),
    fastest_time_ms = case
      when public.speed_test_records.fastest_time_ms is null
        then excluded.fastest_time_ms
      when excluded.fastest_time_ms is null
        then public.speed_test_records.fastest_time_ms
      else least(
        public.speed_test_records.fastest_time_ms,
        excluded.fastest_time_ms
      )
    end,
    best_remaining_seconds = greatest(
      public.speed_test_records.best_remaining_seconds,
      excluded.best_remaining_seconds
    ),
    achieved_at = case
      when excluded.highest_score > public.speed_test_records.highest_score
        then excluded.achieved_at
      else public.speed_test_records.achieved_at
    end,
    updated_at = now();

  return new;
end;
$$;

insert into public.speed_test_records (
  user_id, record_key, game_type, source_kind, source_id,
  difficulty_level, reaction_direction, answer_mode,
  requested_question_count, scoring_version, highest_score,
  best_accuracy, best_combo, fastest_time_ms,
  best_remaining_seconds, achieved_at, updated_at
)
select
  attempts.user_id,
  public.speed_test_record_key(attempts),
  attempts.game_type,
  attempts.source_kind,
  attempts.source_id,
  coalesce(attempts.difficulty_level, ''),
  coalesce(attempts.reaction_direction, ''),
  coalesce(attempts.answer_mode, ''),
  attempts.requested_question_count,
  attempts.scoring_version,
  max(attempts.score),
  max(attempts.accuracy),
  max(attempts.best_combo),
  min(attempts.total_time_ms) filter (
    where attempts.finish_reason = 'completed' and attempts.total_time_ms > 0
  ),
  coalesce(
    max(attempts.remaining_seconds) filter (
      where attempts.finish_reason = 'completed'
    ),
    0
  ),
  max(attempts.finished_at),
  now()
from public.speed_test_attempts as attempts
where attempts.game_type <> 'flash_reaction'
  or (
    attempts.difficulty_level is not null
    and attempts.reaction_direction is not null
  )
group by
  attempts.user_id, public.speed_test_record_key(attempts),
  attempts.game_type, attempts.source_kind, attempts.source_id,
  attempts.difficulty_level, attempts.reaction_direction,
  attempts.answer_mode, attempts.requested_question_count,
  attempts.scoring_version
on conflict (user_id, record_key) do nothing;

create trigger upsert_speed_test_record_after_insert
after insert on public.speed_test_attempts
for each row execute function public.upsert_speed_test_record();

create trigger upsert_flash_record_after_metadata
after update of difficulty_level, reaction_direction
on public.speed_test_attempts
for each row
when (new.game_type = 'flash_reaction')
execute function public.upsert_speed_test_record();

create or replace function public.aggregate_and_prune_speed_attempts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recent_high_accuracy boolean;
begin
  select count(*) = 3 and min(recent.accuracy) >= 90
  into recent_high_accuracy
  from (
    select attempt.accuracy
    from public.speed_test_attempts as attempt
    where attempt.user_id = new.user_id
    order by attempt.created_at desc, attempt.id desc
    limit 3
  ) as recent;

  insert into public.speed_test_user_stats (
    user_id, total_attempts, completed_attempts, accuracy_sum,
    best_accuracy, best_combo, best_remaining_seconds, perfect_tests,
    has_consistent, has_speed_demon, updated_at
  ) values (
    new.user_id,
    1,
    case when new.finish_reason = 'completed' then 1 else 0 end,
    new.accuracy,
    new.accuracy,
    new.best_combo,
    case when new.finish_reason = 'completed' then new.remaining_seconds else 0 end,
    case
      when new.finish_reason = 'completed' and new.accuracy = 100 then 1
      else 0
    end,
    coalesce(recent_high_accuracy, false),
    new.finish_reason = 'completed'
      and new.total_questions >= 30
      and new.remaining_seconds >= 60,
    now()
  )
  on conflict (user_id) do update set
    total_attempts = public.speed_test_user_stats.total_attempts + 1,
    completed_attempts = public.speed_test_user_stats.completed_attempts
      + excluded.completed_attempts,
    accuracy_sum = public.speed_test_user_stats.accuracy_sum
      + excluded.accuracy_sum,
    best_accuracy = greatest(
      public.speed_test_user_stats.best_accuracy,
      excluded.best_accuracy
    ),
    best_combo = greatest(
      public.speed_test_user_stats.best_combo,
      excluded.best_combo
    ),
    best_remaining_seconds = greatest(
      public.speed_test_user_stats.best_remaining_seconds,
      excluded.best_remaining_seconds
    ),
    perfect_tests = public.speed_test_user_stats.perfect_tests
      + excluded.perfect_tests,
    has_consistent = public.speed_test_user_stats.has_consistent
      or excluded.has_consistent,
    has_speed_demon = public.speed_test_user_stats.has_speed_demon
      or excluded.has_speed_demon,
    updated_at = now();

  delete from public.speed_test_attempts
  where id in (
    select old_attempt.id
    from public.speed_test_attempts as old_attempt
    where old_attempt.user_id = new.user_id
    order by old_attempt.created_at desc, old_attempt.id desc
    offset 5
  );

  return new;
end;
$$;

create trigger aggregate_and_prune_speed_attempts_after_insert
after insert on public.speed_test_attempts
for each row execute function public.aggregate_and_prune_speed_attempts();

delete from public.speed_test_attempts as attempts
where attempts.id in (
  select ranked.id
  from (
    select
      candidate.id,
      row_number() over (
        partition by candidate.user_id
        order by candidate.created_at desc, candidate.id desc
      ) as position
    from public.speed_test_attempts as candidate
  ) as ranked
  where ranked.position > 5
);

update public.user_word_progress as progress
set
  korean_snapshot = snapshots.korean,
  vietnamese_snapshot = snapshots.vietnamese,
  lesson_id_snapshot = snapshots.lesson_id
from (
  select distinct on (answers.user_id, answers.vocabulary_id)
    answers.user_id,
    answers.vocabulary_id,
    case
      when answers.direction = 'vi_ko' then answers.expected_answer_snapshot
      else answers.prompt_snapshot
    end as korean,
    case
      when answers.direction = 'vi_ko' then answers.prompt_snapshot
      else answers.expected_answer_snapshot
    end as vietnamese,
    case
      when answers.vocabulary_id like 'custom-%' then 'custom'
      else left('speed-test:' || attempts.source_id, 200)
    end as lesson_id
  from public.speed_test_answers as answers
  join public.speed_test_attempts as attempts on attempts.id = answers.attempt_id
  order by answers.user_id, answers.vocabulary_id, answers.created_at desc
) as snapshots
where progress.user_id = snapshots.user_id
  and progress.vocabulary_id = snapshots.vocabulary_id;

create or replace function public.sync_speed_word_snapshot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_id_value text;
begin
  select attempt.source_id
  into source_id_value
  from public.speed_test_attempts as attempt
  where attempt.id = new.attempt_id;

  insert into public.user_word_progress (
    user_id,
    vocabulary_id,
    korean_snapshot,
    vietnamese_snapshot,
    lesson_id_snapshot
  ) values (
    new.user_id,
    new.vocabulary_id,
    case
      when new.direction = 'vi_ko' then new.expected_answer_snapshot
      else new.prompt_snapshot
    end,
    case
      when new.direction = 'vi_ko' then new.prompt_snapshot
      else new.expected_answer_snapshot
    end,
    case
      when new.vocabulary_id like 'custom-%' then 'custom'
      else left('speed-test:' || coalesce(source_id_value, 'unknown'), 200)
    end
  )
  on conflict (user_id, vocabulary_id) do update set
    korean_snapshot = excluded.korean_snapshot,
    vietnamese_snapshot = excluded.vietnamese_snapshot,
    lesson_id_snapshot = excluded.lesson_id_snapshot,
    updated_at = now()
  ;

  return new;
end;
$$;

create trigger sync_speed_word_snapshot_after_insert
after insert on public.speed_test_answers
for each row execute function public.sync_speed_word_snapshot();

create or replace function public.capture_exam_record()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  maximum_score integer;
  percentage numeric;
  elapsed_seconds integer;
begin
  if new.status not in ('submitted', 'expired')
    or new.attempt_mode <> 'full'
    or new.score is null
  then
    return new;
  end if;

  maximum_score := 200;
  percentage := round(new.score::numeric / maximum_score * 100, 3);
  elapsed_seconds := greatest(
    0,
    extract(epoch from (
      coalesce(new.submitted_at, new.updated_at) - new.started_at
    ))::integer
  );

  insert into public.exam_user_records (
    user_id, exam_id, best_score, max_score, best_percentage,
    correct_count, total_questions, duration_seconds, attempt_id,
    achieved_at, updated_at
  ) values (
    new.user_id, new.exam_id, new.score, maximum_score, percentage,
    coalesce(new.correct_count, 0), new.total_questions, elapsed_seconds,
    new.id, coalesce(new.submitted_at, new.updated_at), now()
  )
  on conflict (user_id, exam_id) do update set
    best_score = excluded.best_score,
    max_score = excluded.max_score,
    best_percentage = excluded.best_percentage,
    correct_count = excluded.correct_count,
    total_questions = excluded.total_questions,
    duration_seconds = excluded.duration_seconds,
    attempt_id = excluded.attempt_id,
    achieved_at = excluded.achieved_at,
    updated_at = now()
  where
    excluded.best_percentage > public.exam_user_records.best_percentage
    or (
      excluded.best_percentage = public.exam_user_records.best_percentage
      and excluded.correct_count > public.exam_user_records.correct_count
    )
    or (
      excluded.best_percentage = public.exam_user_records.best_percentage
      and excluded.correct_count = public.exam_user_records.correct_count
      and excluded.duration_seconds < public.exam_user_records.duration_seconds
    );

  return new;
end;
$$;

insert into public.exam_user_records (
  user_id, exam_id, best_score, max_score, best_percentage,
  correct_count, total_questions, duration_seconds, attempt_id,
  achieved_at, updated_at
)
select distinct on (attempt.user_id, attempt.exam_id)
  attempt.user_id,
  attempt.exam_id,
  coalesce(attempt.score, 0),
  200,
  round(coalesce(attempt.score, 0)::numeric / 200 * 100, 3),
  coalesce(attempt.correct_count, 0),
  attempt.total_questions,
  greatest(
    0,
    extract(epoch from (
      coalesce(attempt.submitted_at, attempt.updated_at) - attempt.started_at
    ))::integer
  ),
  attempt.id,
  coalesce(attempt.submitted_at, attempt.updated_at),
  now()
from public.exam_attempts as attempt
where attempt.status in ('submitted', 'expired')
  and attempt.attempt_mode = 'full'
  and attempt.score is not null
order by
  attempt.user_id,
  attempt.exam_id,
  coalesce(attempt.score, 0)::numeric / 200 desc,
  coalesce(attempt.correct_count, 0) desc,
  coalesce(attempt.submitted_at, attempt.updated_at) - attempt.started_at asc,
  coalesce(attempt.submitted_at, attempt.updated_at) asc
on conflict (user_id, exam_id) do nothing;

create trigger capture_exam_record_after_write
after insert or update of status, score, correct_count, submitted_at
on public.exam_attempts
for each row execute function public.capture_exam_record();

create or replace function public.register_ranked_speed_attempt(p_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  attempt public.speed_test_attempts;
  local_date date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  current_period_start date;
  used_count integer;
  calculated_score integer;
  calculated_duration integer;
  ranking public.speed_test_ranking_records;
begin
  if actor_id is null then raise exception 'UNAUTHENTICATED'; end if;

  select *
  into attempt
  from public.speed_test_attempts
  where id = p_attempt_id and user_id = actor_id
  for update;

  if attempt.id is null then raise exception 'ATTEMPT_NOT_FOUND'; end if;

  if attempt.is_ranked then
    select *
    into ranking
    from public.speed_test_ranking_records
    where user_id = actor_id
      and game_type = attempt.game_type
      and speed_test_ranking_records.period_start = attempt.ranking_period_start;
    return jsonb_build_object(
      'registered', true,
      'duplicate', true,
      'attemptsRemaining', greatest(0, 3 - coalesce((
        select usage.attempt_count
        from public.speed_test_ranked_daily_usage as usage
        where usage.user_id = actor_id
          and usage.game_type = attempt.game_type
          and usage.ranking_date = attempt.ranking_date
      ), 0)),
      'rankScore', ranking.rank_score
    );
  end if;

  if attempt.source_kind <> 'lesson' then
    raise exception 'RANKED_SOURCE_REQUIRED';
  end if;

  if attempt.game_type = 'typing_sprint' and not (
    attempt.requested_question_count = '20'
    and attempt.total_questions = 20
    and attempt.direction = 'ko_vi'
  ) then
    raise exception 'INVALID_RANKED_CONFIG';
  elsif attempt.game_type = 'audio_reaction' and not (
    attempt.requested_question_count = '10'
    and attempt.total_questions = 10
    and attempt.answer_mode = 'choose'
  ) then
    raise exception 'INVALID_RANKED_CONFIG';
  elsif attempt.game_type = 'flash_reaction' and not (
    attempt.difficulty_level = 'medium'
    and attempt.reaction_direction = 'mixed'
    and attempt.total_questions = 20
  ) then
    raise exception 'INVALID_RANKED_CONFIG';
  elsif attempt.game_type = 'card_reaction' and not (
    attempt.difficulty_level = 'medium'
    and attempt.reaction_direction = 'mixed'
    and attempt.answer_mode = 'choose'
    and attempt.total_questions = 16
  ) then
    raise exception 'INVALID_RANKED_CONFIG';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      actor_id::text || ':' || attempt.game_type || ':' || local_date::text,
      0
    )
  );

  select coalesce(usage.attempt_count, 0)
  into used_count
  from public.speed_test_ranked_daily_usage as usage
  where usage.user_id = actor_id
    and usage.game_type = attempt.game_type
    and usage.ranking_date = local_date;

  if coalesce(used_count, 0) >= 3 then
    raise exception 'RANKED_DAILY_LIMIT';
  end if;

  insert into public.speed_test_ranked_daily_usage (
    user_id, game_type, ranking_date, attempt_count, updated_at
  ) values (
    actor_id, attempt.game_type, local_date, 1, now()
  )
  on conflict (user_id, game_type, ranking_date) do update set
    attempt_count = public.speed_test_ranked_daily_usage.attempt_count + 1,
    updated_at = now();

  current_period_start := local_date
    - (extract(isodow from local_date)::integer - 1);
  calculated_duration := case
    when attempt.total_time_ms > 0 then attempt.total_time_ms
    else greatest(
      0,
      extract(epoch from (attempt.finished_at - attempt.started_at))::integer
        * 1000
    )
  end;
  calculated_score := case
    when attempt.game_type = 'typing_sprint' then
      round(attempt.accuracy * 100)::integer
        + attempt.correct_count * 50
        + attempt.best_combo * 20
        + attempt.remaining_seconds * 10
    else attempt.score
  end;

  update public.speed_test_attempts
  set
    is_ranked = true,
    ranking_date = local_date,
    ranking_period_start = current_period_start
  where id = p_attempt_id;

  insert into public.speed_test_ranking_records (
    user_id, game_type, period_start, rank_score, raw_score,
    accuracy, best_combo, duration_ms, attempt_id, source_id,
    achieved_at, updated_at
  ) values (
    actor_id, attempt.game_type, current_period_start, calculated_score,
    attempt.score, attempt.accuracy, attempt.best_combo,
    calculated_duration, attempt.id, attempt.source_id,
    attempt.finished_at, now()
  )
  on conflict (user_id, game_type, period_start) do update set
    rank_score = excluded.rank_score,
    raw_score = excluded.raw_score,
    accuracy = excluded.accuracy,
    best_combo = excluded.best_combo,
    duration_ms = excluded.duration_ms,
    attempt_id = excluded.attempt_id,
    source_id = excluded.source_id,
    achieved_at = excluded.achieved_at,
    updated_at = now()
  where
    excluded.rank_score > public.speed_test_ranking_records.rank_score
    or (
      excluded.rank_score = public.speed_test_ranking_records.rank_score
      and excluded.accuracy > public.speed_test_ranking_records.accuracy
    )
    or (
      excluded.rank_score = public.speed_test_ranking_records.rank_score
      and excluded.accuracy = public.speed_test_ranking_records.accuracy
      and excluded.duration_ms < public.speed_test_ranking_records.duration_ms
    );

  select *
  into ranking
  from public.speed_test_ranking_records
  where user_id = actor_id
    and game_type = attempt.game_type
    and speed_test_ranking_records.period_start = current_period_start;

  return jsonb_build_object(
    'registered', true,
    'attemptsRemaining', greatest(0, 2 - coalesce(used_count, 0)),
    'rankScore', ranking.rank_score,
    'periodStart', current_period_start
  );
end;
$$;

revoke all on function public.register_ranked_speed_attempt(uuid) from public;
grant execute on function public.register_ranked_speed_attempt(uuid) to authenticated;

revoke all on function public.speed_test_record_key(public.speed_test_attempts) from public;
revoke all on function public.upsert_speed_test_record() from public;
revoke all on function public.aggregate_and_prune_speed_attempts() from public;
revoke all on function public.sync_speed_word_snapshot() from public;
revoke all on function public.capture_exam_record() from public;
