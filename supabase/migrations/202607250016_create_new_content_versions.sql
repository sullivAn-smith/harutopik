create function public.create_new_content_revision(
  p_source_revision_id uuid,
  p_change_summary text default ''
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_revision public.content_revisions%rowtype;
  new_revision_id uuid;
  next_version integer;
  new_payload jsonb;
begin
  if not public.has_app_role(array['content_editor','admin']::public.app_role[]) then
    raise exception 'insufficient_privilege';
  end if;

  select * into source_revision
  from public.content_revisions
  where id = p_source_revision_id
    and status in ('published', 'unpublished', 'archived');

  if not found then raise exception 'source_revision_not_reusable'; end if;

  select coalesce(max(version), 0) + 1 into next_version
  from public.content_revisions
  where content_id = source_revision.content_id;

  new_payload := jsonb_set(
    jsonb_set(source_revision.payload, '{version}', to_jsonb(next_version), true),
    '{status}', '"draft"'::jsonb, true
  );

  insert into public.content_revisions (
    content_id, content_type, version, status, payload,
    change_summary, created_by
  ) values (
    source_revision.content_id, source_revision.content_type, next_version,
    'draft', new_payload, nullif(trim(p_change_summary), ''), (select auth.uid())
  )
  returning id into new_revision_id;

  insert into public.audit_logs (
    actor_id, action, entity_type, entity_id, metadata
  ) values (
    (select auth.uid()), 'content.revision.created', source_revision.content_type,
    source_revision.content_id,
    jsonb_build_object(
      'source_revision_id', source_revision.id,
      'revision_id', new_revision_id,
      'version', next_version
    )
  );

  return new_revision_id;
end;
$$;

revoke all on function public.create_new_content_revision(uuid, text) from public;
grant execute on function public.create_new_content_revision(uuid, text) to authenticated;

create function public.archive_previous_published_revision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'published' and old.status <> 'published' then
    update public.content_revisions
    set status = 'archived', updated_at = now()
    where content_id = new.content_id
      and id <> new.id
      and status = 'published';
  end if;
  return new;
end;
$$;

create trigger archive_previous_published_revision
before update of status on public.content_revisions
for each row execute function public.archive_previous_published_revision();
