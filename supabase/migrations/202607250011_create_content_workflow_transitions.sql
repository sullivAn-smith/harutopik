create function public.transition_content_revision(
  p_revision_id uuid,
  p_target_status public.content_workflow_status
)
returns public.content_workflow_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  revision public.content_revisions%rowtype;
  entry public.content_entries%rowtype;
begin
  select *
  into revision
  from public.content_revisions
  where id = p_revision_id
  for update;

  if not found then
    raise exception 'revision_not_found';
  end if;

  if revision.status = 'draft' and p_target_status = 'in_review' then
    if not public.has_app_role(
      array['content_editor','admin']::public.app_role[]
    ) then
      raise exception 'insufficient_privilege';
    end if;
    if revision.created_by <> (select auth.uid())
      and not public.has_app_role(array['admin']::public.app_role[]) then
      raise exception 'not_revision_owner';
    end if;
  elsif revision.status = 'in_review' and p_target_status = 'approved' then
    if not public.has_app_role(
      array['content_reviewer','admin']::public.app_role[]
    ) then
      raise exception 'insufficient_privilege';
    end if;
  elsif revision.status = 'approved' and p_target_status = 'published' then
    if not public.has_app_role(array['admin']::public.app_role[]) then
      raise exception 'insufficient_privilege';
    end if;
  else
    raise exception 'invalid_content_transition';
  end if;

  update public.content_revisions
  set
    status = p_target_status,
    reviewed_by = case
      when p_target_status = 'approved' then (select auth.uid())
      else reviewed_by
    end,
    published_by = case
      when p_target_status = 'published' then (select auth.uid())
      else published_by
    end,
    published_at = case
      when p_target_status = 'published' then now()
      else published_at
    end,
    updated_at = now()
  where id = p_revision_id;

  if p_target_status = 'published' then
    select *
    into entry
    from public.content_entries
    where id = revision.content_id;

    insert into public.published_catalog (
      content_id, content_type, slug, parent_id, version, payload, published_at
    )
    values (
      revision.content_id,
      revision.content_type,
      entry.slug,
      entry.parent_id,
      revision.version,
      jsonb_set(revision.payload, '{status}', '"published"'::jsonb, true),
      now()
    )
    on conflict (content_id) do update
    set
      content_type = excluded.content_type,
      slug = excluded.slug,
      parent_id = excluded.parent_id,
      version = excluded.version,
      payload = excluded.payload,
      published_at = excluded.published_at;
  end if;

  insert into public.audit_logs (
    actor_id, action, entity_type, entity_id, metadata
  )
  values (
    (select auth.uid()),
    'content.workflow.transition',
    revision.content_type,
    revision.content_id,
    jsonb_build_object(
      'revision_id', revision.id,
      'from', revision.status,
      'to', p_target_status
    )
  );

  return p_target_status;
end;
$$;

revoke all on function public.transition_content_revision(
  uuid, public.content_workflow_status
) from public;

grant execute on function public.transition_content_revision(
  uuid, public.content_workflow_status
) to authenticated;
