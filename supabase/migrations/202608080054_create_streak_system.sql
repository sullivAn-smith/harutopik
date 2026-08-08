create table public.streak_settings (
  id boolean primary key default true check (id),
  timezone text not null default 'Asia/Ho_Chi_Minh',
  shield_reward_interval integer not null default 10 check (shield_reward_interval between 1 and 365),
  shield_reward_amount integer not null default 1 check (shield_reward_amount between 1 and 100),
  max_shields integer not null default 10 check (max_shields between 0 and 1000),
  reminder_enabled boolean not null default true,
  reminder_hour smallint not null default 20 check (reminder_hour between 0 and 23),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

insert into public.streak_settings (id) values (true)
on conflict (id) do nothing;

create table public.user_streaks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  timezone text not null default 'Asia/Ho_Chi_Minh',
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),
  shield_count integer not null default 0 check (shield_count >= 0),
  last_activity_date date,
  last_rewarded_milestone integer not null default 0 check (last_rewarded_milestone >= 0),
  shield_used_dates date[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table public.streak_activity_days (
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_date date not null,
  completed_at timestamptz not null,
  source_type text not null check (source_type in ('lesson', 'review', 'exam')),
  source_id text,
  created_at timestamptz not null default now(),
  primary key (user_id, activity_date)
);

create table public.streak_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in (
    'activity', 'shield_earned', 'shield_used', 'admin_grant', 'streak_reset'
  )),
  activity_date date,
  amount integer not null default 0,
  balance_after integer not null default 0,
  actor_id uuid references auth.users(id),
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index streak_ledger_user_created_idx
  on public.streak_ledger (user_id, created_at desc);

create table public.streak_banner_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 100),
  slot text not null default 'day' check (slot in ('day', 'night', 'holiday')),
  desktop_image_url text,
  mobile_image_url text,
  alt_text text not null default 'Banner chuỗi ngày học Harutopik',
  starts_at timestamptz,
  ends_at timestamptz,
  daily_start time not null default '05:00',
  daily_end time not null default '18:00',
  priority integer not null default 0,
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create index streak_banner_active_idx
  on public.streak_banner_campaigns (is_active, priority desc, starts_at, ends_at);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'streak-banners',
  'streak-banners',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.streak_settings enable row level security;
alter table public.user_streaks enable row level security;
alter table public.streak_activity_days enable row level security;
alter table public.streak_ledger enable row level security;
alter table public.streak_banner_campaigns enable row level security;

create policy "Users read own streak"
on public.user_streaks for select
using ((select auth.uid()) = user_id or public.has_app_role(array['admin']::public.app_role[]));

create policy "Users read own streak days"
on public.streak_activity_days for select
using ((select auth.uid()) = user_id or public.has_app_role(array['admin']::public.app_role[]));

create policy "Users read own streak ledger"
on public.streak_ledger for select
using ((select auth.uid()) = user_id or public.has_app_role(array['admin']::public.app_role[]));

create policy "Authenticated users read active streak banners"
on public.streak_banner_campaigns for select
using (is_active or public.has_app_role(array['admin']::public.app_role[]));

create policy "Admins manage streak banners"
on public.streak_banner_campaigns for all
using (public.has_app_role(array['admin']::public.app_role[]))
with check (public.has_app_role(array['admin']::public.app_role[]));

create policy "Authenticated users read streak settings"
on public.streak_settings for select
to authenticated
using (true);

create policy "Admins upload streak banners"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'streak-banners'
  and public.has_app_role(array['admin']::public.app_role[])
);

create policy "Admins update streak banners"
on storage.objects for update to authenticated
using (
  bucket_id = 'streak-banners'
  and public.has_app_role(array['admin']::public.app_role[])
)
with check (
  bucket_id = 'streak-banners'
  and public.has_app_role(array['admin']::public.app_role[])
);

create policy "Admins delete streak banners"
on storage.objects for delete to authenticated
using (
  bucket_id = 'streak-banners'
  and public.has_app_role(array['admin']::public.app_role[])
);

grant select on public.user_streaks, public.streak_activity_days,
  public.streak_ledger, public.streak_banner_campaigns to authenticated;
grant select on public.streak_banner_campaigns to anon;
grant select on public.streak_settings to authenticated;
grant insert, update, delete on public.streak_banner_campaigns to authenticated;

create or replace function public.record_streak_activity(
  p_user_id uuid,
  p_completed_at timestamptz,
  p_source_type text,
  p_source_id text default null
)
returns public.user_streaks
language plpgsql
security definer
set search_path = ''
as $$
declare
  settings public.streak_settings;
  streak public.user_streaks;
  activity_day date;
  yesterday date;
  inserted_day_count integer := 0;
  reward_milestone integer;
  reward_amount integer := 0;
  used_shield boolean := false;
begin
  if p_user_id is null or p_completed_at is null then
    raise exception 'invalid_streak_activity';
  end if;
  if p_source_type not in ('lesson', 'review', 'exam') then
    raise exception 'invalid_streak_source';
  end if;
  if p_completed_at > now() + interval '5 minutes'
     or p_completed_at < now() - interval '14 days' then
    raise exception 'invalid_streak_timestamp';
  end if;

  select * into settings from public.streak_settings where id = true;
  insert into public.user_streaks (user_id, timezone)
  values (p_user_id, settings.timezone)
  on conflict (user_id) do nothing;

  select * into streak from public.user_streaks
  where user_id = p_user_id for update;
  activity_day := (p_completed_at at time zone streak.timezone)::date;
  yesterday := activity_day - 1;

  insert into public.streak_activity_days (
    user_id, activity_date, completed_at, source_type, source_id
  ) values (
    p_user_id, activity_day, p_completed_at, p_source_type, p_source_id
  ) on conflict (user_id, activity_date) do nothing;
  get diagnostics inserted_day_count = row_count;

  if inserted_day_count = 0 or (
    streak.last_activity_date is not null
    and activity_day <= streak.last_activity_date
  ) then
    return streak;
  end if;

  if streak.last_activity_date is null then
    streak.current_streak := 1;
  elsif streak.last_activity_date = yesterday then
    streak.current_streak := streak.current_streak + 1;
  elsif streak.shield_count > 0 then
    streak.shield_count := streak.shield_count - 1;
    streak.shield_used_dates := array_append(streak.shield_used_dates, yesterday);
    used_shield := true;
  else
    streak.current_streak := 1;
    insert into public.streak_ledger (
      user_id, event_type, activity_date, balance_after, metadata
    ) values (
      p_user_id, 'streak_reset', activity_day, streak.shield_count,
      jsonb_build_object('previous_activity_date', streak.last_activity_date)
    );
  end if;

  streak.longest_streak := greatest(streak.longest_streak, streak.current_streak);
  streak.last_activity_date := activity_day;

  if used_shield then
    insert into public.streak_ledger (
      user_id, event_type, activity_date, amount, balance_after
    ) values (
      p_user_id, 'shield_used', yesterday, -1, streak.shield_count
    );
  end if;

  reward_milestone := (streak.current_streak / settings.shield_reward_interval)
    * settings.shield_reward_interval;
  if reward_milestone > streak.last_rewarded_milestone then
    reward_amount := least(
      settings.shield_reward_amount,
      greatest(settings.max_shields - streak.shield_count, 0)
    );
    streak.shield_count := streak.shield_count + reward_amount;
    streak.last_rewarded_milestone := reward_milestone;
    if reward_amount > 0 then
      insert into public.streak_ledger (
        user_id, event_type, activity_date, amount, balance_after, metadata
      ) values (
        p_user_id, 'shield_earned', activity_day, reward_amount,
        streak.shield_count, jsonb_build_object('milestone', reward_milestone)
      );
    end if;
  end if;

  update public.user_streaks set
    current_streak = streak.current_streak,
    longest_streak = streak.longest_streak,
    shield_count = streak.shield_count,
    last_activity_date = streak.last_activity_date,
    last_rewarded_milestone = streak.last_rewarded_milestone,
    shield_used_dates = streak.shield_used_dates,
    updated_at = now()
  where user_id = p_user_id
  returning * into streak;

  insert into public.streak_ledger (
    user_id, event_type, activity_date, balance_after, metadata
  ) values (
    p_user_id, 'activity', activity_day, streak.shield_count,
    jsonb_build_object('source_type', p_source_type, 'source_id', p_source_id)
  );
  return streak;
end;
$$;

revoke all on function public.record_streak_activity(uuid, timestamptz, text, text) from public;
grant execute on function public.record_streak_activity(uuid, timestamptz, text, text) to service_role;

create or replace function public.admin_update_streak_settings(
  p_interval integer,
  p_reward_amount integer,
  p_max_shields integer,
  p_reminder_enabled boolean,
  p_reminder_hour integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_app_role(array['admin']::public.app_role[]) then
    raise exception 'insufficient_privilege';
  end if;
  if p_interval not between 1 and 365
     or p_reward_amount not between 1 and 100
     or p_max_shields not between 0 and 1000
     or p_reminder_hour not between 0 and 23 then
    raise exception 'invalid_streak_settings';
  end if;
  update public.streak_settings set
    shield_reward_interval = p_interval,
    shield_reward_amount = p_reward_amount,
    max_shields = p_max_shields,
    reminder_enabled = p_reminder_enabled,
    reminder_hour = p_reminder_hour,
    updated_by = (select auth.uid()),
    updated_at = now()
  where id = true;
end;
$$;

create or replace function public.admin_grant_streak_shields(
  p_user_ids uuid[],
  p_amount integer,
  p_reason text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_id uuid;
  granted_count integer := 0;
  new_balance integer;
begin
  if not public.has_app_role(array['admin']::public.app_role[]) then
    raise exception 'insufficient_privilege';
  end if;
  if coalesce(array_length(p_user_ids, 1), 0) = 0
     or p_amount not between 1 and 100
     or char_length(trim(p_reason)) < 3 then
    raise exception 'invalid_shield_grant';
  end if;
  foreach target_id in array p_user_ids loop
    insert into public.user_streaks (user_id, shield_count)
    values (target_id, p_amount)
    on conflict (user_id) do update set
      shield_count = public.user_streaks.shield_count + excluded.shield_count,
      updated_at = now()
    returning shield_count into new_balance;
    insert into public.streak_ledger (
      user_id, event_type, amount, balance_after, actor_id, reason
    ) values (
      target_id, 'admin_grant', p_amount, new_balance,
      (select auth.uid()), trim(p_reason)
    );
    granted_count := granted_count + 1;
  end loop;
  return granted_count;
end;
$$;

revoke all on function public.admin_update_streak_settings(integer, integer, integer, boolean, integer) from public;
revoke all on function public.admin_grant_streak_shields(uuid[], integer, text) from public;
grant execute on function public.admin_update_streak_settings(integer, integer, integer, boolean, integer) to authenticated;
grant execute on function public.admin_grant_streak_shields(uuid[], integer, text) to authenticated;

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'content_submitted',
  'content_approved',
  'content_changes_requested',
  'streak_reminder',
  'streak_reward'
));

create or replace function public.enqueue_daily_streak_reminders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  settings public.streak_settings;
  today_vn date;
  inserted_count integer;
begin
  select * into settings from public.streak_settings where id = true;
  if not settings.reminder_enabled then return 0; end if;
  if extract(hour from (now() at time zone settings.timezone))::integer
     <> settings.reminder_hour then
    return 0;
  end if;
  today_vn := (now() at time zone settings.timezone)::date;
  insert into public.notifications (user_id, type, title, message, href)
  select
    streak.user_id,
    'streak_reminder',
    'Giữ chuỗi học hôm nay',
    'Bạn chưa học hôm nay. Hoàn thành một hoạt động ngắn để giữ chuỗi ' || streak.current_streak || ' ngày.',
    '/'
  from public.user_streaks streak
  where streak.current_streak >= 1
    and streak.last_activity_date < today_vn
    and not exists (
      select 1 from public.notifications notification
      where notification.user_id = streak.user_id
        and notification.type = 'streak_reminder'
        and (notification.created_at at time zone settings.timezone)::date = today_vn
    );
  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

revoke all on function public.enqueue_daily_streak_reminders() from public;
grant execute on function public.enqueue_daily_streak_reminders() to service_role;

do $$
begin
  if to_regclass('cron.job') is not null then
    if exists (
      select 1 from pg_catalog.pg_tables
      where schemaname = 'cron' and tablename = 'job'
    ) then
      execute 'select cron.unschedule(jobid) from cron.job where jobname = $1'
        using 'harutopik-streak-reminder';
      execute 'select cron.schedule($1, $2, $3)'
        using 'harutopik-streak-reminder', '0 * * * *',
          'select public.enqueue_daily_streak_reminders();';
    end if;
  end if;
end;
$$;
