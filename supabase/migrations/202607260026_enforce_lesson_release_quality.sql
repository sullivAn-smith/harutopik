create function public.validate_lesson_revision_quality()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  vocabulary_count integer;
  unique_hangul integer;
  unique_meanings integer;
  entry public.content_entries%rowtype;
  module_entry public.content_entries%rowtype;
begin
  if new.content_type <> 'lesson'
    or new.status not in ('in_review', 'approved', 'published') then
    return new;
  end if;

  if jsonb_typeof(new.payload->'vocabulary') <> 'array' then
    raise exception 'lesson_vocabulary_must_be_array';
  end if;

  select
    count(*),
    count(distinct trim(item->>'korean')),
    count(distinct lower(trim(item->>'vietnamese')))
  into vocabulary_count, unique_hangul, unique_meanings
  from jsonb_array_elements(new.payload->'vocabulary') item;

  if vocabulary_count < 4 then
    raise exception 'lesson_requires_four_vocabulary_items';
  end if;
  if unique_hangul < 4 or unique_meanings < 4 then
    raise exception 'lesson_requires_four_distinct_vocabulary_pairs';
  end if;
  if jsonb_typeof(new.payload->'grammar') <> 'array'
    or jsonb_typeof(new.payload->'exercises') <> 'array' then
    raise exception 'lesson_content_sections_invalid';
  end if;

  if new.status = 'published' then
    select * into entry from public.content_entries
    where id = new.content_id and content_type = 'lesson';
    if not found or entry.parent_id is null then
      raise exception 'lesson_module_missing';
    end if;

    select * into module_entry from public.content_entries
    where id = entry.parent_id and content_type = 'module';
    if not found or module_entry.parent_id is null then
      raise exception 'lesson_course_missing';
    end if;

    if new.payload->>'moduleId' <> module_entry.id
      or new.payload->>'courseId' <> module_entry.parent_id then
      raise exception 'lesson_catalog_identity_mismatch';
    end if;
    if not exists (
      select 1 from public.published_catalog
      where content_id = module_entry.id and content_type = 'module'
    ) or not exists (
      select 1 from public.published_catalog
      where content_id = module_entry.parent_id and content_type = 'course'
    ) then
      raise exception 'lesson_catalog_parents_not_published';
    end if;
  end if;
  return new;
end;
$$;

create trigger validate_lesson_revision_quality
before update of status on public.content_revisions
for each row execute function public.validate_lesson_revision_quality();
