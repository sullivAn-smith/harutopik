-- Keep the reusable vocabulary library independent from the lifecycle of a
-- lesson. A lesson leaving the published catalog releases its vocabulary
-- links; vocabulary that is not used by another published lesson becomes a
-- draft again instead of remaining permanently marked as published.

create or replace function public.refresh_vocabulary_usage_status(
  p_vocabulary_ids text[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.vocabulary_items vocabulary
  set
    status = 'draft',
    updated_at = now()
  where vocabulary.id = any(coalesce(p_vocabulary_ids, array[]::text[]))
    and vocabulary.status = 'published'
    and not exists (
      select 1
      from public.lesson_vocabulary lesson_word
      join public.published_catalog catalog
        on catalog.content_id = lesson_word.lesson_id
       and catalog.content_type = 'lesson'
      where lesson_word.vocabulary_id = vocabulary.id
    );
end;
$$;

revoke all on function public.refresh_vocabulary_usage_status(text[]) from public;

create or replace function public.release_unpublished_lesson_vocabulary()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_vocabulary_ids text[];
begin
  if old.content_type <> 'lesson' then
    return old;
  end if;

  select coalesce(array_agg(link.vocabulary_id), array[]::text[])
  into affected_vocabulary_ids
  from public.lesson_vocabulary link
  where link.lesson_id = old.content_id;

  delete from public.lesson_vocabulary
  where lesson_id = old.content_id;

  perform public.refresh_vocabulary_usage_status(affected_vocabulary_ids);
  return old;
end;
$$;

drop trigger if exists release_unpublished_lesson_vocabulary
on public.published_catalog;

create trigger release_unpublished_lesson_vocabulary
after delete on public.published_catalog
for each row
execute function public.release_unpublished_lesson_vocabulary();

-- Repair links left behind by the previous unpublish workflow.
with stale_links as (
  select link.lesson_id, link.vocabulary_id
  from public.lesson_vocabulary link
  where not exists (
    select 1
    from public.published_catalog catalog
    where catalog.content_id = link.lesson_id
      and catalog.content_type = 'lesson'
  )
),
deleted_links as (
  delete from public.lesson_vocabulary link
  using stale_links stale
  where link.lesson_id = stale.lesson_id
    and link.vocabulary_id = stale.vocabulary_id
  returning link.vocabulary_id
)
update public.vocabulary_items vocabulary
set
  status = 'draft',
  updated_at = now()
where vocabulary.id in (select distinct vocabulary_id from deleted_links)
  and vocabulary.status = 'published'
  and not exists (
    select 1
    from public.lesson_vocabulary lesson_word
    join public.published_catalog catalog
      on catalog.content_id = lesson_word.lesson_id
     and catalog.content_type = 'lesson'
    where lesson_word.vocabulary_id = vocabulary.id
  );

-- Draft deletion still archives only that revision. Deleting an unpublished
-- lesson removes every revision from the CMS, but intentionally preserves the
-- reusable vocabulary master records and historical audit data.
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
  if revision.deleted_at is not null then
    return 'archived';
  end if;
  if revision.status not in (
    'draft', 'changes_requested', 'unpublished', 'archived'
  ) then
    raise exception 'revision_not_deletable';
  end if;

  if revision.status = 'unpublished' then
    if exists (
      select 1 from public.published_catalog catalog
      where catalog.content_id = revision.content_id
    ) then
      raise exception 'lesson_must_be_unpublished_before_delete';
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

    select coalesce(array_agg(link.vocabulary_id), array[]::text[])
    into affected_vocabulary_ids
    from public.lesson_vocabulary link
    where link.lesson_id = revision.content_id;

    delete from public.lesson_vocabulary
    where lesson_id = revision.content_id;

    perform public.refresh_vocabulary_usage_status(affected_vocabulary_ids);

    update public.content_revisions
    set
      status = 'archived',
      deleted_at = coalesce(deleted_at, now()),
      deleted_by = coalesce(deleted_by, (select auth.uid())),
      updated_at = now()
    where content_id = revision.content_id
      and content_type = 'lesson';

    update public.content_entries
    set updated_at = now()
    where id = revision.content_id;

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
        'deletion_mode', 'logical',
        'vocabulary_preserved', true
      )
    );

    return 'deleted';
  end if;

  update public.content_revisions
  set
    status = 'archived',
    deleted_at = now(),
    deleted_by = (select auth.uid()),
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
      'previous_status', revision.status
    )
  );

  return 'archived';
end;
$$;

revoke all on function public.delete_or_archive_lesson(uuid) from public;
grant execute on function public.delete_or_archive_lesson(uuid) to authenticated;
