-- CMS deletion is intentionally soft-only. Physical deletion belongs to a
-- separate maintenance workflow so an editor action can never remove content
-- that learners are currently using.

alter table public.published_catalog
drop constraint if exists published_catalog_content_id_fkey;

alter table public.published_catalog
add constraint published_catalog_content_id_fkey
foreign key (content_id)
references public.content_entries(id)
on delete restrict;

create or replace function public.prevent_published_revision_deletion()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.published_catalog catalog
    where catalog.content_id = old.content_id
      and catalog.version = old.version
  ) then
    raise exception 'published_revision_cannot_delete';
  end if;
  return old;
end;
$$;

drop trigger if exists protect_published_revision_from_delete
on public.content_revisions;

create trigger protect_published_revision_from_delete
before delete on public.content_revisions
for each row
execute function public.prevent_published_revision_deletion();

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
begin
  if not public.has_app_role(
    array['content_editor','admin']::public.app_role[]
  ) then
    raise exception 'insufficient_privilege';
  end if;

  select revision_row.* into revision
  from public.content_revisions revision_row
  join public.content_entries entry
    on entry.id = revision_row.content_id
  where revision_row.id = p_revision_id
  for update of revision_row, entry;

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
