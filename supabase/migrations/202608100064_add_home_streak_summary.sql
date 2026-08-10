create or replace function public.get_home_streak_summary()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'streak', case
      when streak.user_id is null then null
      else jsonb_build_object(
        'currentStreak', streak.current_streak,
        'longestStreak', streak.longest_streak,
        'shieldCount', streak.shield_count,
        'lastActivityDate', streak.last_activity_date,
        'activityDates', coalesce((
          select jsonb_agg(days.activity_date order by days.activity_date desc)
          from (
            select activity.activity_date
            from public.streak_activity_days as activity
            where activity.user_id = (select auth.uid())
            order by activity.activity_date desc
            limit 14
          ) as days
        ), '[]'::jsonb)
      )
    end,
    'rules', jsonb_build_object(
      'shieldRewardInterval', settings.shield_reward_interval,
      'shieldRewardAmount', settings.shield_reward_amount,
      'maxShields', settings.max_shields
    ),
    'period', case
      when extract(hour from current_timestamp at time zone 'Asia/Ho_Chi_Minh') between 5 and 17
        then 'day'
      else 'night'
    end
  )
  from public.streak_settings as settings
  left join public.user_streaks as streak
    on streak.user_id = (select auth.uid())
  where settings.id = true;
$$;

revoke all on function public.get_home_streak_summary() from public;
grant execute on function public.get_home_streak_summary() to authenticated;
