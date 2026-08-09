-- A lesson created from the editor can own a dedicated module wrapper. When
-- that lesson is permanently deleted, remove the empty wrapper's complete CMS
-- lifecycle as well so its ID, slug and catalog position are reusable.

create or replace function public.cleanup_empty_lesson_module_after_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed_module_id text;
begin
  if old.content_type <> 'lesson' or old.parent_id is null then
    return old;
  end if;

  if old.parent_id not like 'lesson-%'
    or not exists (
      select 1
      from public.audit_logs draft_log
      where draft_log.action = 'content.lesson.draft_created'
        and draft_log.entity_type = 'lesson'
        and draft_log.entity_id = old.id
        and draft_log.metadata->>'module_id' = old.parent_id
    ) then
    return old;
  end if;

  -- Never remove a shared chapter. Catalog rows are checked separately because
  -- a live child can temporarily outlast its content entry during maintenance.
  if exists (
      select 1 from public.content_entries child
      where child.parent_id = old.parent_id
    )
    or exists (
      select 1 from public.published_catalog child_catalog
      where child_catalog.parent_id = old.parent_id
        and child_catalog.content_id <> old.id
    ) then
    return old;
  end if;

  delete from public.published_catalog
  where content_id = old.parent_id
    and content_type = 'module';

  delete from public.content_releases
  where content_id = old.parent_id;

  delete from public.content_revisions
  where content_id = old.parent_id
    and content_type = 'module';

  delete from public.content_entries module_entry
  where module_entry.id = old.parent_id
    and module_entry.content_type = 'module'
    and not exists (
      select 1 from public.content_entries child
      where child.parent_id = module_entry.id
    )
  returning module_entry.id into removed_module_id;

  if removed_module_id is not null then
    insert into public.audit_logs (
      actor_id, action, entity_type, entity_id, metadata
    ) values (
      (select auth.uid()),
      'content.module.empty_wrapper_deleted',
      'module',
      removed_module_id,
      jsonb_build_object(
        'deleted_lesson_id', old.id,
        'deletion_mode', 'permanent',
        'identity_released', true
      )
    );
  end if;

  return old;
end;
$$;

revoke all on function public.cleanup_empty_lesson_module_after_delete()
from public;

-- The former Birthday lesson was deleted and then recreated with the same
-- identity. The owner has explicitly requested removal of this replacement.
-- Keep vocabulary master records, but release the lesson/module identity and
-- remove learner state tied to the deleted lesson.
do $$
declare
  target_lesson_id constant text := 'lesson-topik-1-13';
  target_module_id constant text := 'lesson-topik-1-013';
  affected_vocabulary_ids text[];
begin
  if not exists (
    select 1
    from public.content_entries entry
    where entry.id = target_lesson_id
      and entry.content_type = 'lesson'
      and entry.slug = 'sinh-nhat'
      and entry.parent_id = target_module_id
  ) then
    return;
  end if;

  select coalesce(array_agg(distinct vocabulary_id), array[]::text[])
  into affected_vocabulary_ids
  from (
    select link.vocabulary_id
    from public.lesson_vocabulary link
    where link.lesson_id = target_lesson_id

    union

    select vocabulary_id.value
    from public.content_revisions lesson_revision
    cross join lateral jsonb_array_elements_text(
      case
        when jsonb_typeof(lesson_revision.payload->'vocabularyIds') = 'array'
          then lesson_revision.payload->'vocabularyIds'
        else '[]'::jsonb
      end
    ) vocabulary_id(value)
    where lesson_revision.content_id = target_lesson_id
      and lesson_revision.content_type = 'lesson'
  ) vocabulary_ids;

  delete from public.published_catalog
  where content_id = target_lesson_id
    and content_type = 'lesson';

  delete from public.content_releases
  where content_id = target_lesson_id;

  delete from public.content_revisions
  where content_id = target_lesson_id
    and content_type = 'lesson';

  delete from public.study_sessions
  where lesson_id = target_lesson_id;

  delete from public.lesson_progress
  where lesson_id = target_lesson_id;

  delete from public.learning_events
  where lesson_id = target_lesson_id;

  -- lesson_vocabulary is removed by ON DELETE CASCADE. The AFTER DELETE
  -- trigger above then removes the now-empty dedicated module wrapper.
  delete from public.content_entries
  where id = target_lesson_id
    and content_type = 'lesson';

  perform public.refresh_vocabulary_usage_status(affected_vocabulary_ids);

  insert into public.audit_logs (
    actor_id, action, entity_type, entity_id, metadata
  ) values (
    null,
    'content.lesson.owner_requested_cleanup',
    'lesson',
    target_lesson_id,
    jsonb_build_object(
      'module_id', target_module_id,
      'slug', 'sinh-nhat',
      'deletion_mode', 'permanent',
      'identity_released', true,
      'vocabulary_preserved', true,
      'migration', '202608090063'
    )
  );
end;
$$;
