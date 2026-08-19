-- Repair historical automatic Speed Test rankings so every record uses the
-- Monday of its Vietnam-local week. New attempts are already written with
-- this convention by register_ranked_speed_attempt.
with calculated as (
  select
    attempt.*,
    (attempt.finished_at at time zone 'Asia/Ho_Chi_Minh')::date
      - (extract(isodow from (attempt.finished_at at time zone 'Asia/Ho_Chi_Minh')::date)::integer - 1) as period_start,
    case
      when attempt.total_time_ms > 0 then attempt.total_time_ms
      else greatest(
        0,
        extract(epoch from (attempt.finished_at - attempt.started_at))::integer * 1000
      )
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
  where attempt.game_type in (
    'typing_sprint',
    'audio_reaction',
    'flash_reaction',
    'card_reaction'
  )
), weekly_best as (
  select
    calculated.*,
    row_number() over (
      partition by calculated.user_id, calculated.game_type, calculated.period_start
      order by calculated.calculated_score desc,
        calculated.accuracy desc,
        calculated.calculated_duration asc,
        calculated.finished_at asc
    ) as weekly_position
  from calculated
)
insert into public.speed_test_ranking_records (
  user_id,
  game_type,
  period_start,
  rank_score,
  raw_score,
  accuracy,
  best_combo,
  duration_ms,
  attempt_id,
  source_id,
  achieved_at,
  updated_at
)
select
  weekly_best.user_id,
  weekly_best.game_type,
  weekly_best.period_start,
  weekly_best.calculated_score,
  weekly_best.score,
  weekly_best.accuracy,
  weekly_best.best_combo,
  weekly_best.calculated_duration,
  weekly_best.id,
  weekly_best.source_id,
  weekly_best.finished_at,
  now()
from weekly_best
where weekly_best.weekly_position = 1
on conflict (user_id, game_type, period_start) do update set
  rank_score = excluded.rank_score,
  raw_score = excluded.raw_score,
  accuracy = excluded.accuracy,
  best_combo = excluded.best_combo,
  duration_ms = excluded.duration_ms,
  attempt_id = excluded.attempt_id,
  source_id = excluded.source_id,
  achieved_at = excluded.achieved_at,
  updated_at = now();

delete from public.speed_test_ranking_records as ranking
using public.speed_test_attempts as attempt
where ranking.attempt_id = attempt.id
  and ranking.period_start <>
    (attempt.finished_at at time zone 'Asia/Ho_Chi_Minh')::date
      - (extract(isodow from (attempt.finished_at at time zone 'Asia/Ho_Chi_Minh')::date)::integer - 1);

update public.speed_test_attempts
set
  is_ranked = true,
  ranking_date = (finished_at at time zone 'Asia/Ho_Chi_Minh')::date,
  ranking_period_start = (finished_at at time zone 'Asia/Ho_Chi_Minh')::date
    - (extract(isodow from (finished_at at time zone 'Asia/Ho_Chi_Minh')::date)::integer - 1)
where game_type in (
  'typing_sprint',
  'audio_reaction',
  'flash_reaction',
  'card_reaction'
);
