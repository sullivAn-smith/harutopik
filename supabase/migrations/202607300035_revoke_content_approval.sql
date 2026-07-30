create or replace function public.revoke_content_approval(
  p_revision_id uuid
)
returns public.content_workflow_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  revision public.content_revisions%rowtype;
begin
  if not public.has_app_role(array['admin']::public.app_role[]) then
    raise exception 'insufficient_privilege';
  end if;

  select * into revision
  from public.content_revisions
  where id = p_revision_id
  for update;

  if not found then raise exception 'revision_not_found'; end if;
  if revision.status <> 'approved' then
    raise exception 'revision_not_approved';
  end if;

  update public.content_revisions
  set
    status = 'in_review',
    reviewed_by = null,
    updated_at = now()
  where id = p_revision_id;

  insert into public.audit_logs (
    actor_id, action, entity_type, entity_id, metadata
  ) values (
    (select auth.uid()),
    'content.approval.revoked',
    revision.content_type,
    revision.content_id,
    jsonb_build_object(
      'revision_id', revision.id,
      'from', 'approved',
      'to', 'in_review'
    )
  );

  return 'in_review';
end;
$$;

revoke all on function public.revoke_content_approval(uuid) from public;
grant execute on function public.revoke_content_approval(uuid) to authenticated;
