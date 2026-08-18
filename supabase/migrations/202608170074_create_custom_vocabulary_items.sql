alter table public.vocabulary_list_items
  add constraint vocabulary_list_items_required_text_check
  check (
    jsonb_typeof(snapshot -> 'korean') = 'string'
    and char_length(trim(snapshot ->> 'korean')) > 0
    and jsonb_typeof(snapshot -> 'vietnamese') = 'string'
    and char_length(trim(snapshot ->> 'vietnamese')) > 0
  )
  not valid;

alter table public.vocabulary_list_items
  validate constraint vocabulary_list_items_required_text_check;

alter table public.vocabulary_list_items
  add constraint vocabulary_list_items_custom_identity_check
  check (
    (
      lesson_id = 'custom'
      and vocabulary_id like 'custom-%'
    )
    or (
      lesson_id <> 'custom'
      and vocabulary_id not like 'custom-%'
    )
  )
  not valid;

alter table public.vocabulary_list_items
  validate constraint vocabulary_list_items_custom_identity_check;

create index vocabulary_list_items_custom_user_idx
on public.vocabulary_list_items(user_id, created_at desc)
where lesson_id = 'custom' and vocabulary_id like 'custom-%';

create or replace function public.enforce_custom_vocabulary_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  custom_count integer;
begin
  if new.lesson_id <> 'custom'
    or new.vocabulary_id not like 'custom-%'
  then
    return new;
  end if;

  if tg_op = 'UPDATE'
    and old.user_id = new.user_id
    and old.lesson_id = 'custom'
    and old.vocabulary_id like 'custom-%'
  then
    return new;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(new.user_id::text, 0)
  );

  select count(*)
  into custom_count
  from public.vocabulary_list_items
  where user_id = new.user_id
    and lesson_id = 'custom'
    and vocabulary_id like 'custom-%';

  if custom_count >= 50 then
    raise exception 'CUSTOM_VOCABULARY_LIMIT'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger enforce_custom_vocabulary_limit
before insert or update of user_id, vocabulary_id, lesson_id
on public.vocabulary_list_items
for each row execute function public.enforce_custom_vocabulary_limit();

revoke all on function public.enforce_custom_vocabulary_limit() from public;
