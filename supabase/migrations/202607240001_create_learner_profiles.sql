create type public.korean_level as enum (
  'absolute_beginner',
  'beginner',
  'intermediate',
  'advanced'
);

create type public.learning_goal as enum (
  'daily_communication',
  'topik',
  'study_abroad',
  'work',
  'culture'
);

create table public.learner_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 50),
  avatar_url text,
  native_language text not null default 'vi',
  korean_level public.korean_level not null default 'absolute_beginner',
  learning_goal public.learning_goal not null default 'topik',
  daily_goal_minutes smallint not null default 15
    check (daily_goal_minutes between 5 and 180),
  timezone text not null default 'Asia/Ho_Chi_Minh',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.learner_profiles enable row level security;

create policy "Learners can read their own profile"
on public.learner_profiles for select
using ((select auth.uid()) = id);

create policy "Learners can update their own profile"
on public.learner_profiles for update
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create function public.handle_new_learner()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.learner_profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), 'Học viên Harutopik')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_learner();
