-- Read-only leaderboard snapshot.
--
-- This function intentionally reads the existing aggregate/record tables and
-- does not modify the triggers that decide which exam or speed-test attempt is
-- the learner's best result.

create index if not exists user_streaks_current_rank_idx
  on public.user_streaks (current_streak desc, last_activity_date desc)
  where current_streak > 0;

create index if not exists user_streaks_longest_rank_idx
  on public.user_streaks (longest_streak desc, last_activity_date desc)
  where longest_streak > 0;

create or replace function public.get_leaderboard_snapshot(
  p_current_user_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with runtime as (
    select (now() at time zone 'Asia/Ho_Chi_Minh')::date as local_date
  ), ranking_period as (
    select
      local_date
        - (extract(isodow from local_date)::integer - 1) as period_start
    from runtime
  ), published_exams as (
    select exam.id
    from public.exam_sets as exam
    where exam.status = 'published'
  ), eligible_profiles as (
    select
      profile.id,
      profile.display_name,
      profile.avatar_url
    from public.learner_profiles as profile
    where profile.leaderboard_opt_in
  ), speed_ranked as (
    select
      ranking.game_type as board,
      row_number() over (
        partition by ranking.game_type
        order by
          ranking.rank_score desc,
          ranking.accuracy desc,
          ranking.duration_ms asc,
          ranking.achieved_at asc
      ) as position,
      ranking.user_id,
      profile.display_name,
      profile.avatar_url,
      ranking.rank_score::numeric as score,
      ranking.accuracy,
      ranking.duration_ms::bigint as duration_ms,
      ranking.best_combo,
      null::bigint as exam_count,
      null::bigint as correct_count,
      ranking.achieved_at
    from public.speed_test_ranking_records as ranking
    join eligible_profiles as profile on profile.id = ranking.user_id
    cross join ranking_period as period
    where ranking.period_start = period.period_start
  ), exam_totals as (
    select
      record.user_id,
      profile.display_name,
      profile.avatar_url,
      sum(record.best_score)::numeric as score,
      round(
        sum(record.best_score)::numeric
          / nullif(sum(record.max_score), 0)::numeric
          * 100,
        1
      ) as accuracy,
      (sum(record.duration_seconds)::bigint * 1000) as duration_ms,
      count(*)::bigint as exam_count,
      sum(record.correct_count)::bigint as correct_count,
      max(record.achieved_at) as achieved_at
    from public.exam_user_records as record
    join published_exams as exam on exam.id = record.exam_id
    join eligible_profiles as profile on profile.id = record.user_id
    group by
      record.user_id,
      profile.display_name,
      profile.avatar_url
  ), exam_ranked as (
    select
      'exam'::text as board,
      row_number() over (
        order by
          total.score desc,
          total.duration_ms asc,
          total.accuracy desc,
          total.achieved_at asc
      ) as position,
      total.user_id,
      total.display_name,
      total.avatar_url,
      total.score,
      total.accuracy,
      total.duration_ms,
      null::integer as best_combo,
      total.exam_count,
      total.correct_count,
      total.achieved_at
    from exam_totals as total
  ), current_streak_ranked as (
    select
      'current_streak'::text as board,
      row_number() over (
        order by
          streak.current_streak desc,
          streak.last_activity_date desc
      ) as position,
      streak.user_id,
      profile.display_name,
      profile.avatar_url,
      streak.current_streak::numeric as score,
      null::numeric as accuracy,
      null::bigint as duration_ms,
      null::integer as best_combo,
      null::bigint as exam_count,
      null::bigint as correct_count,
      null::timestamptz as achieved_at
    from public.user_streaks as streak
    join eligible_profiles as profile on profile.id = streak.user_id
    where streak.current_streak > 0
  ), longest_streak_ranked as (
    select
      'longest_streak'::text as board,
      row_number() over (
        order by
          streak.longest_streak desc,
          streak.last_activity_date desc
      ) as position,
      streak.user_id,
      profile.display_name,
      profile.avatar_url,
      streak.longest_streak::numeric as score,
      null::numeric as accuracy,
      null::bigint as duration_ms,
      null::integer as best_combo,
      null::bigint as exam_count,
      null::bigint as correct_count,
      null::timestamptz as achieved_at
    from public.user_streaks as streak
    join eligible_profiles as profile on profile.id = streak.user_id
    where streak.longest_streak > 0
  ), all_ranked as (
    select * from exam_ranked
    union all
    select * from speed_ranked
    union all
    select * from current_streak_ranked
    union all
    select * from longest_streak_ranked
  ), selected_ranked as (
    select *
    from all_ranked
    where position <= 30 or user_id = p_current_user_id
  ), boards(board) as (
    values
      ('exam'::text),
      ('typing_sprint'::text),
      ('audio_reaction'::text),
      ('flash_reaction'::text),
      ('card_reaction'::text),
      ('current_streak'::text),
      ('longest_streak'::text)
  ), board_payloads as (
    select
      board_list.board,
      coalesce(
        jsonb_agg(
          jsonb_strip_nulls(
            jsonb_build_object(
              'rank', ranked.position,
              'userId', ranked.user_id,
              'displayName', ranked.display_name,
              'avatarUrl', ranked.avatar_url,
              'score', ranked.score,
              'accuracy', ranked.accuracy,
              'durationMs', ranked.duration_ms,
              'bestCombo', ranked.best_combo,
              'examCount', ranked.exam_count,
              'correctCount', ranked.correct_count,
              'achievedAt', ranked.achieved_at
            )
          )
          order by ranked.position
        ) filter (where ranked.user_id is not null),
        '[]'::jsonb
      ) as entries
    from boards as board_list
    left join selected_ranked as ranked on ranked.board = board_list.board
    group by board_list.board
  )
  select jsonb_build_object(
    'generatedAt', now(),
    'periodStart', (select period_start from ranking_period),
    'publishedExamCount', (select count(*) from published_exams),
    'boards', (
      select jsonb_object_agg(payload.board, payload.entries)
      from board_payloads as payload
    )
  );
$$;

revoke all on function public.get_leaderboard_snapshot(uuid) from public;
grant execute on function public.get_leaderboard_snapshot(uuid) to service_role;
