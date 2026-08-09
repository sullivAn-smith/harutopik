-- Lesson drafts created by the legacy editor can have a dedicated module
-- wrapper (for example lesson-topik-1-013 -> lesson-topik-1-13). Permanently
-- deleting the lesson must also remove that wrapper once it is empty. Keeping
-- it would leave a ghost card in the catalog structure and reserve its slug.

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

  -- Only remove a module proven by the lesson creation audit to have been the
  -- wrapper selected for this exact lesson. Normal shared chapters remain.
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

  if exists (
      select 1 from public.content_entries child
      where child.parent_id = old.parent_id
    )
    or exists (
      select 1 from public.published_catalog child_catalog
      where child_catalog.parent_id = old.parent_id
    )
    or exists (
      select 1 from public.content_revisions module_revision
      where module_revision.content_id = old.parent_id
    )
    or exists (
      select 1 from public.content_releases module_release
      where module_release.content_id = old.parent_id
    ) then
    return old;
  end if;

  delete from public.published_catalog
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

drop trigger if exists cleanup_empty_lesson_module_after_delete
on public.content_entries;

create trigger cleanup_empty_lesson_module_after_delete
after delete on public.content_entries
for each row
when (old.content_type = 'lesson')
execute function public.cleanup_empty_lesson_module_after_delete();

-- Repair wrappers left by older deletions. The audit pair ties an empty
-- module to a lesson that has genuinely been permanently deleted, preventing
-- this migration from removing intentionally empty/shared chapters.
do $$
declare
  orphan_module record;
begin
  for orphan_module in
    select distinct
      module_entry.id,
      deletion_log.entity_id as deleted_lesson_id
    from public.content_entries module_entry
    join public.audit_logs draft_log
      on draft_log.action = 'content.lesson.draft_created'
      and draft_log.entity_type = 'lesson'
      and draft_log.metadata->>'module_id' = module_entry.id
    join public.audit_logs deletion_log
      on deletion_log.action = 'content.lesson.deleted'
      and deletion_log.entity_type = 'lesson'
      and deletion_log.entity_id = draft_log.entity_id
      and deletion_log.metadata->>'deletion_mode' = 'permanent'
    where module_entry.content_type = 'module'
      and module_entry.id like 'lesson-%'
      and not exists (
        select 1 from public.content_entries child
        where child.parent_id = module_entry.id
      )
      and not exists (
        select 1 from public.published_catalog child_catalog
        where child_catalog.parent_id = module_entry.id
      )
      and not exists (
        select 1 from public.content_revisions module_revision
        where module_revision.content_id = module_entry.id
      )
      and not exists (
        select 1 from public.content_releases module_release
        where module_release.content_id = module_entry.id
      )
      and not exists (
        select 1 from public.content_entries deleted_lesson
        where deleted_lesson.id = deletion_log.entity_id
      )
  loop
    delete from public.published_catalog
    where content_id = orphan_module.id
      and content_type = 'module';

    delete from public.content_entries
    where id = orphan_module.id
      and content_type = 'module';

    if found then
      insert into public.audit_logs (
        actor_id, action, entity_type, entity_id, metadata
      ) values (
        null,
        'content.module.orphan_delete_repaired',
        'module',
        orphan_module.id,
        jsonb_build_object(
          'deleted_lesson_id', orphan_module.deleted_lesson_id,
          'deletion_mode', 'permanent',
          'identity_released', true,
          'migration', '202608090062'
        )
      );
    end if;
  end loop;
end;
$$;
