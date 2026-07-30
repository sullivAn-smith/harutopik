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
  has_release boolean;
  has_published_catalog boolean;
  has_other_revisions boolean;
begin
  if not public.has_app_role(
    array['content_editor','admin']::public.app_role[]
  ) then
    raise exception 'insufficient_privilege';
  end if;

  select * into revision
  from public.content_revisions
  where id = p_revision_id
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

  select exists (
    select 1
    from public.content_releases
    where content_id = revision.content_id
  ) into has_release;

  select exists (
    select 1
    from public.published_catalog
    where content_id = revision.content_id
  ) into has_published_catalog;

  select exists (
    select 1
    from public.content_revisions
    where content_id = revision.content_id
      and id <> revision.id
      and deleted_at is null
  ) into has_other_revisions;

  if has_release
    or has_published_catalog
    or has_other_revisions
    or revision.status in ('unpublished', 'archived') then
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
      jsonb_build_object('revision_id', revision.id)
    );
    return 'archived';
  end if;

  if revision.status not in ('draft', 'changes_requested') then
    raise exception 'revision_not_deletable';
  end if;

  delete from public.content_revisions
  where id = revision.id;

  if not exists (
    select 1
    from public.content_revisions
    where content_id = revision.content_id
  ) and not exists (
    select 1
    from public.published_catalog
    where content_id = revision.content_id
  ) then
    delete from public.content_entries
    where id = revision.content_id
      and content_type = 'lesson';
  end if;

  insert into public.audit_logs (
    actor_id, action, entity_type, entity_id, metadata
  ) values (
    (select auth.uid()),
    'content.lesson.revision_deleted',
    'lesson',
    revision.content_id,
    jsonb_build_object('revision_id', revision.id)
  );
  return 'deleted';
end;
$$;

revoke all on function public.delete_or_archive_lesson(uuid) from public;
grant execute on function public.delete_or_archive_lesson(uuid) to authenticated;
