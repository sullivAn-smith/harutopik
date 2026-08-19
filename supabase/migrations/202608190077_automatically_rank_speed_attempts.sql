-- Every saved Speed Test session automatically participates in the weekly
-- leaderboard. Ranking no longer requires a designated lesson, locked config,
-- or a separate daily allowance.
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
  calculated_score integer;
  calculated_duration integer;
  ranking public.speed_test_ranking_records;
begin
  if actor_id is null then raise exception 'UNAUTHENTICATED'; end if;

  select * into attempt
  from public.speed_test_attempts
  where id = p_attempt_id and user_id = actor_id
  for update;

  if attempt.id is null then raise exception 'ATTEMPT_NOT_FOUND'; end if;

  if attempt.is_ranked then
    select * into ranking
    from public.speed_test_ranking_records
    where user_id = actor_id
      and game_type = attempt.game_type
      and period_start = attempt.ranking_period_start;
    return jsonb_build_object(
      'registered', true,
      'automatic', true,
      'duplicate', true,
      'rankScore', ranking.rank_score
    );
  end if;

  current_period_start := local_date
    - (extract(isodow from local_date)::integer - 1);
  calculated_duration := case
    when attempt.total_time_ms > 0 then attempt.total_time_ms
    else greatest(0, extract(epoch from (attempt.finished_at - attempt.started_at))::integer * 1000)
  end;
  calculated_score := case
    when attempt.game_type = 'typing_sprint' then
      round(attempt.accuracy * 100)::integer
        + round(attempt.correct_count::numeric / greatest(attempt.total_questions, 1) * 1000)::integer
        + round(attempt.best_combo::numeric / greatest(attempt.total_questions, 1) * 400)::integer
        + attempt.remaining_seconds * 10
    else round(attempt.score::numeric * (case attempt.game_type
      when 'audio_reaction' then 10
      when 'flash_reaction' then 20
      when 'card_reaction' then 16
      else greatest(attempt.total_questions, 1)
    end) / greatest(attempt.total_questions, 1))::integer
  end;

  update public.speed_test_attempts
  set is_ranked = true,
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
    or (excluded.rank_score = public.speed_test_ranking_records.rank_score
      and excluded.accuracy > public.speed_test_ranking_records.accuracy)
    or (excluded.rank_score = public.speed_test_ranking_records.rank_score
      and excluded.accuracy = public.speed_test_ranking_records.accuracy
      and excluded.duration_ms < public.speed_test_ranking_records.duration_ms);

  select * into ranking
  from public.speed_test_ranking_records
  where user_id = actor_id
    and game_type = attempt.game_type
    and period_start = current_period_start;

  return jsonb_build_object(
    'registered', true,
    'automatic', true,
    'rankScore', ranking.rank_score,
    'periodStart', current_period_start
  );
end;
$$;

revoke all on function public.register_ranked_speed_attempt(uuid) from public;
grant execute on function public.register_ranked_speed_attempt(uuid) to authenticated;

-- Recalculate every historical session with the same formula used for new
-- sessions, then retain the best attempt for each learner, game, and week.
with calculated as (
  select
    attempt.*,
    (attempt.finished_at at time zone 'Asia/Ho_Chi_Minh')::date
      - (extract(isodow from (attempt.finished_at at time zone 'Asia/Ho_Chi_Minh')::date)::integer - 1) as local_date,
    case
      when attempt.total_time_ms > 0 then attempt.total_time_ms
      else greatest(0, extract(epoch from (attempt.finished_at - attempt.started_at))::integer * 1000)
    end as calculated_duration,
    case
      when attempt.game_type = 'typing_sprint' then
        round(attempt.accuracy * 100)::integer
          + round(attempt.correct_count::numeric / greatest(attempt.total_questions, 1) * 1000)::integer
          + round(attempt.best_combo::numeric / greatest(attempt.total_questions, 1) * 400)::integer
          + attempt.remaining_seconds * 10
      else round(attempt.score::numeric * (case attempt.game_type
        when 'audio_reaction' then 10
        when 'flash_reaction' then 20
        when 'card_reaction' then 16
        else greatest(attempt.total_questions, 1)
      end) / greatest(attempt.total_questions, 1))::integer
    end as calculated_score
  from public.speed_test_attempts as attempt
  where attempt.game_type in ('typing_sprint', 'audio_reaction', 'flash_reaction', 'card_reaction')
), daily_best as (
  select calculated.*,
    row_number() over (
      partition by calculated.user_id, calculated.game_type, calculated.local_date
      order by calculated.calculated_score desc, calculated.accuracy desc,
        calculated.calculated_duration asc, calculated.finished_at asc
    ) as daily_position
  from calculated
)
insert into public.speed_test_ranking_records (
  user_id, game_type, period_start, rank_score, raw_score,
  accuracy, best_combo, duration_ms, attempt_id, source_id,
  achieved_at, updated_at
)
select
  daily_best.user_id, daily_best.game_type, daily_best.local_date,
  daily_best.calculated_score, daily_best.score, daily_best.accuracy,
  daily_best.best_combo, daily_best.calculated_duration, daily_best.id,
  daily_best.source_id, daily_best.finished_at, now()
from daily_best
where daily_best.daily_position = 1
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
  or (excluded.rank_score = public.speed_test_ranking_records.rank_score
    and excluded.accuracy > public.speed_test_ranking_records.accuracy)
  or (excluded.rank_score = public.speed_test_ranking_records.rank_score
    and excluded.accuracy = public.speed_test_ranking_records.accuracy
    and excluded.duration_ms < public.speed_test_ranking_records.duration_ms);

update public.speed_test_attempts
set
  is_ranked = true,
  ranking_date = (finished_at at time zone 'Asia/Ho_Chi_Minh')::date,
  ranking_period_start = (finished_at at time zone 'Asia/Ho_Chi_Minh')::date
    - (extract(isodow from (finished_at at time zone 'Asia/Ho_Chi_Minh')::date)::integer - 1)
where game_type in ('typing_sprint', 'audio_reaction', 'flash_reaction', 'card_reaction');
