alter table public.learner_profiles
  add column onboarding_completed boolean not null default false,
  add column onboarding_completed_at timestamptz;

create or replace function public.handle_new_learner()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.learner_profiles (id, display_name, avatar_url)
  values (
    new.id,
    left(
      coalesce(
        nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
        nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
        nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
        'Học viên Harutopik'
      ),
      50
    ),
    nullif(
      coalesce(
        new.raw_user_meta_data ->> 'avatar_url',
        new.raw_user_meta_data ->> 'picture'
      ),
      ''
    )
  );
  return new;
end;
$$;

update public.learner_profiles as profile
set
  display_name = left(
    coalesce(
      nullif(trim(users.raw_user_meta_data ->> 'display_name'), ''),
      nullif(trim(users.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(users.raw_user_meta_data ->> 'name'), ''),
      profile.display_name
    ),
    50
  ),
  avatar_url = coalesce(
    profile.avatar_url,
    nullif(users.raw_user_meta_data ->> 'avatar_url', ''),
    nullif(users.raw_user_meta_data ->> 'picture', '')
  ),
  updated_at = now()
from auth.users as users
where profile.id = users.id;
