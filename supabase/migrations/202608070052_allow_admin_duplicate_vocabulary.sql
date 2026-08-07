-- Editors keep the existing natural-key duplicate guard. Administrators and
-- service-role hotfix actions may intentionally create or update duplicates.
create or replace function public.guard_non_admin_duplicate_vocabulary()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce((select auth.jwt()->>'role'), '') = 'service_role'
    or public.has_app_role(array['admin']::public.app_role[]) then
    return new;
  end if;

  if exists (
    select 1
    from public.vocabulary_items existing
    where existing.id <> new.id
      and existing.normalized_hangul = new.normalized_hangul
      and coalesce(existing.part_of_speech, '') = coalesce(new.part_of_speech, '')
      and lower(existing.primary_meaning_vi) = lower(new.primary_meaning_vi)
  ) then
    raise exception using
      errcode = '23505',
      message = 'duplicate vocabulary natural key';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_non_admin_duplicate_vocabulary
on public.vocabulary_items;

create trigger guard_non_admin_duplicate_vocabulary
before insert or update of normalized_hangul, part_of_speech, primary_meaning_vi
on public.vocabulary_items
for each row execute function public.guard_non_admin_duplicate_vocabulary();

drop index if exists public.vocabulary_items_natural_key_idx;
