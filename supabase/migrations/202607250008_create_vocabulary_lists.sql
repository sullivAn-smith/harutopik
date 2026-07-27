create type public.vocabulary_list_kind as enum ('favorites', 'custom');

create table public.vocabulary_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 60),
  kind public.vocabulary_list_kind not null default 'custom',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create unique index one_favorites_list_per_learner
on public.vocabulary_lists (user_id)
where kind = 'favorites';

create table public.vocabulary_list_items (
  list_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  vocabulary_id text not null check (char_length(vocabulary_id) between 1 and 200),
  lesson_id text not null check (char_length(lesson_id) between 1 and 200),
  snapshot jsonb not null check (
    jsonb_typeof(snapshot) = 'object'
    and snapshot ? 'korean'
    and snapshot ? 'vietnamese'
  ),
  created_at timestamptz not null default now(),
  primary key (list_id, vocabulary_id),
  foreign key (list_id, user_id)
    references public.vocabulary_lists(id, user_id)
    on delete cascade
);

create index vocabulary_list_items_user_id_idx
on public.vocabulary_list_items (user_id, created_at desc);

alter table public.vocabulary_lists enable row level security;
alter table public.vocabulary_list_items enable row level security;

create policy "Learners manage their own vocabulary lists"
on public.vocabulary_lists
for all
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Learners manage their own vocabulary list items"
on public.vocabulary_list_items
for all
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.vocabulary_lists
    where vocabulary_lists.id = vocabulary_list_items.list_id
      and vocabulary_lists.user_id = (select auth.uid())
  )
);

grant select, insert, update, delete
on public.vocabulary_lists, public.vocabulary_list_items
to authenticated;

insert into public.vocabulary_lists (user_id, name, kind)
select users.id, 'Từ yêu thích', 'favorites'
from auth.users as users
on conflict do nothing;

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

  insert into public.vocabulary_lists (user_id, name, kind)
  values (new.id, 'Từ yêu thích', 'favorites');

  return new;
end;
$$;
