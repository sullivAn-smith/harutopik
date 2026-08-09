-- Permanently remove lessons that are no longer published so their stable ID,
-- slug and position can be reused. Vocabulary master records remain reusable.
-- If another revision of the lesson is still published, deleting a draft only
-- archives that draft and leaves the live lesson untouched.

create or replace function public.delete_or_archive_lesson(
  p_revision_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  revision public.content_revisions%rowtype;
  affected_vocabulary_ids text[];
  has_published_catalog boolean;
begin
  if not public.has_app_role(
    array['content_editor','admin']::public.app_role[]
  ) then
    raise exception 'insufficient_privilege';
  end if;

  select revision_row.* into revision
  from public.content_revisions revision_row
  where revision_row.id = p_revision_id
  for update;

  if not found then raise exception 'revision_not_found'; end if;
  if revision.content_type <> 'lesson' then
    raise exception 'invalid_content_type';
  end if;
  if revision.created_by <> (select auth.uid())
    and not public.has_app_role(array['admin']::public.app_role[]) then
    raise exception 'not_revision_owner';
  end if;
  if revision.status in ('in_review', 'approved', 'published') then
    raise exception 'active_revision_cannot_delete';
  end if;
  if revision.status not in (
    'draft', 'changes_requested', 'unpublished', 'archived'
  ) then
    raise exception 'revision_not_deletable';
  end if;

  select exists (
    select 1
    from public.published_catalog catalog
    where catalog.content_id = revision.content_id
      and catalog.content_type = 'lesson'
  ) into has_published_catalog;

  -- A draft can coexist with an older published revision. In that case only
  -- remove the draft; deleting the shared content entry would remove the live
  -- lesson as well.
  if has_published_catalog then
    if revision.status = 'unpublished' then
      raise exception 'lesson_must_be_unpublished_before_delete';
    end if;

    update public.content_revisions
    set
      status = 'archived',
      deleted_at = coalesce(deleted_at, now()),
      deleted_by = coalesce(deleted_by, (select auth.uid())),
      updated_at = now()
    where id = p_revision_id;

    insert into public.audit_logs (
      actor_id, action, entity_type, entity_id, metadata
    ) values (
      (select auth.uid()),
      'content.lesson.revision_archived',
      'lesson',
      revision.content_id,
      jsonb_build_object(
        'revision_id', revision.id,
        'version', revision.version,
        'previous_status', revision.status,
        'published_lesson_preserved', true
      )
    );

    return 'archived';
  end if;

  if exists (
    select 1
    from public.content_revisions active_revision
    where active_revision.content_id = revision.content_id
      and active_revision.deleted_at is null
      and active_revision.status in ('in_review', 'approved', 'published')
  ) then
    raise exception 'active_revision_cannot_delete';
  end if;

  -- Include both materialized links and IDs kept inside drafts. The latter is
  -- important for lessons that have never reached the published catalog.
  select coalesce(array_agg(distinct vocabulary_id), array[]::text[])
  into affected_vocabulary_ids
  from (
    select link.vocabulary_id
    from public.lesson_vocabulary link
    where link.lesson_id = revision.content_id

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
    where lesson_revision.content_id = revision.content_id
      and lesson_revision.content_type = 'lesson'
  ) vocabulary_ids;

  -- Release rows deliberately use RESTRICT foreign keys, so remove the
  -- history belonging to the lesson before deleting its revisions and entry.
  delete from public.content_releases
  where content_id = revision.content_id;

  delete from public.content_revisions
  where content_id = revision.content_id
    and content_type = 'lesson';

  delete from public.content_entries
  where id = revision.content_id
    and content_type = 'lesson';

  if not found then
    raise exception 'lesson_not_found';
  end if;

  -- Reusing the same stable lesson ID must not inherit a deleted lesson's
  -- learner state. Personal vocabulary lists are intentionally preserved.
  delete from public.study_sessions
  where lesson_id = revision.content_id;

  delete from public.lesson_progress
  where lesson_id = revision.content_id;

  delete from public.learning_events
  where lesson_id = revision.content_id;

  perform public.refresh_vocabulary_usage_status(affected_vocabulary_ids);

  insert into public.audit_logs (
    actor_id, action, entity_type, entity_id, metadata
  ) values (
    (select auth.uid()),
    'content.lesson.deleted',
    'lesson',
    revision.content_id,
    jsonb_build_object(
      'source_revision_id', revision.id,
      'source_version', revision.version,
      'deletion_mode', 'permanent',
      'identity_released', true,
      'learner_state_removed', true,
      'vocabulary_preserved', true
    )
  );

  return 'deleted';
end;
$$;

revoke all on function public.delete_or_archive_lesson(uuid) from public;
grant execute on function public.delete_or_archive_lesson(uuid) to authenticated;

-- Older versions of delete_or_archive_lesson only marked every revision as
-- deleted. The content entry itself remained behind and continued reserving
-- the lesson ID, slug and order. Remove only entries that are proven to have
-- gone through that old logical-delete workflow, have no live revision and
-- are not present in the published catalog.
do $$
declare
  legacy_lesson_ids text[];
  legacy_vocabulary_ids text[];
begin
  select coalesce(array_agg(entry.id), array[]::text[])
  into legacy_lesson_ids
  from public.content_entries entry
  where entry.content_type = 'lesson'
    and not exists (
      select 1
      from public.published_catalog catalog
      where catalog.content_id = entry.id
        and catalog.content_type = 'lesson'
    )
    and not exists (
      select 1
      from public.content_revisions live_revision
      where live_revision.content_id = entry.id
        and live_revision.content_type = 'lesson'
        and live_revision.deleted_at is null
    )
    and exists (
      select 1
      from public.audit_logs deletion_log
      where deletion_log.entity_type = 'lesson'
        and deletion_log.entity_id = entry.id
        and deletion_log.action = 'content.lesson.deleted'
        and deletion_log.metadata->>'deletion_mode' = 'logical'
    );

  if cardinality(legacy_lesson_ids) = 0 then
    return;
  end if;

  select coalesce(array_agg(distinct vocabulary_id), array[]::text[])
  into legacy_vocabulary_ids
  from (
    select link.vocabulary_id
    from public.lesson_vocabulary link
    where link.lesson_id = any(legacy_lesson_ids)

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
    where lesson_revision.content_id = any(legacy_lesson_ids)
      and lesson_revision.content_type = 'lesson'
  ) vocabulary_ids;

  delete from public.content_releases
  where content_id = any(legacy_lesson_ids);

  delete from public.content_revisions
  where content_id = any(legacy_lesson_ids)
    and content_type = 'lesson';

  delete from public.content_entries
  where id = any(legacy_lesson_ids)
    and content_type = 'lesson';

  delete from public.study_sessions
  where lesson_id = any(legacy_lesson_ids);

  delete from public.lesson_progress
  where lesson_id = any(legacy_lesson_ids);

  delete from public.learning_events
  where lesson_id = any(legacy_lesson_ids);

  perform public.refresh_vocabulary_usage_status(legacy_vocabulary_ids);

  insert into public.audit_logs (
    actor_id, action, entity_type, entity_id, metadata
  )
  select
    null,
    'content.lesson.legacy_delete_repaired',
    'lesson',
    lesson_id,
    jsonb_build_object(
      'deletion_mode', 'permanent',
      'identity_released', true,
      'migration', '202608090061'
    )
  from unnest(legacy_lesson_ids) lesson_id;
end;
$$;
