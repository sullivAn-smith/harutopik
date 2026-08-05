-- Keep lesson identity errors deterministic for every CMS entry point.
-- Existing duplicate sort orders are left untouched; the trigger only blocks
-- new conflicts or changes to a lesson's position.

create or replace function public.enforce_lesson_identity_conflicts()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  course_id text;
begin
  if new.content_type <> 'lesson' then
    return new;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('lesson-id:' || new.id, 0)
  );

  if tg_op = 'INSERT' and exists (
    select 1
    from public.content_entries entry
    where entry.id = new.id
  ) then
    raise exception 'lesson_id_conflict'
      using detail = format('ID %s is already in use.', new.id);
  end if;

  select module.parent_id into course_id
  from public.content_entries module
  where module.id = new.parent_id
    and module.content_type = 'module';

  if course_id is null then
    return new;
  end if;

  -- Serialize identity checks inside one course so concurrent editor requests
  -- cannot reserve the same slug or lesson number at the same time.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(course_id, 0)
  );

  if (tg_op = 'INSERT' or new.slug is distinct from old.slug
      or new.parent_id is distinct from old.parent_id)
    and exists (
      select 1
      from public.content_entries entry
      where entry.content_type = 'lesson'
        and entry.parent_id = new.parent_id
        and entry.slug = new.slug
        and entry.id <> new.id
    ) then
    raise exception 'lesson_slug_conflict'
      using detail = format('Slug %s is already in use in module %s.', new.slug, new.parent_id);
  end if;

  if (tg_op = 'INSERT' or new.sort_order is distinct from old.sort_order
      or new.parent_id is distinct from old.parent_id)
    and exists (
      select 1
      from public.content_entries lesson
      join public.content_entries module
        on module.id = lesson.parent_id
       and module.content_type = 'module'
      where lesson.content_type = 'lesson'
        and module.parent_id = course_id
        and lesson.sort_order = new.sort_order
        and lesson.id <> new.id
    ) then
    raise exception 'lesson_order_conflict'
      using detail = format(
        'Lesson order %s is already in use in course %s.',
        new.sort_order,
        course_id
      );
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_lesson_identity_conflicts
on public.content_entries;

create trigger enforce_lesson_identity_conflicts
before insert or update of slug, parent_id, sort_order
on public.content_entries
for each row
execute function public.enforce_lesson_identity_conflicts();
