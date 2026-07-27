create function public.update_lesson_draft(
  p_revision_id uuid,
  p_slug text,
  p_course_id text,
  p_module_id text,
  p_title jsonb,
  p_sort_order integer,
  p_payload jsonb,
  p_change_summary text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  revision public.content_revisions%rowtype;
begin
  if not public.has_app_role(array['content_editor','admin']::public.app_role[]) then
    raise exception 'insufficient_privilege';
  end if;

  select *
  into revision
  from public.content_revisions
  where id = p_revision_id
  for update;

  if not found then
    raise exception 'revision_not_found';
  end if;

  if revision.content_type <> 'lesson' or revision.status <> 'draft' then
    raise exception 'revision_not_editable';
  end if;

  if revision.created_by <> (select auth.uid())
    and not public.has_app_role(array['admin']::public.app_role[]) then
    raise exception 'not_revision_owner';
  end if;

  if p_payload->>'id' <> revision.content_id::text then
    raise exception 'content_id_mismatch';
  end if;

  update public.content_entries
  set
    slug = p_slug,
    course_id = p_course_id,
    module_id = p_module_id,
    title = p_title,
    sort_order = p_sort_order,
    updated_at = now()
  where id = revision.content_id;

  update public.content_revisions
  set
    payload = p_payload,
    change_summary = nullif(trim(p_change_summary), ''),
    updated_at = now()
  where id = p_revision_id;

  insert into public.audit_logs (
    actor_id, action, entity_type, entity_id, metadata
  )
  values (
    (select auth.uid()),
    'content.draft.update',
    'lesson',
    revision.content_id,
    jsonb_build_object('revision_id', p_revision_id)
  );

  return p_revision_id;
end;
$$;

revoke all on function public.update_lesson_draft(
  uuid, text, text, text, jsonb, integer, jsonb, text
) from public;

grant execute on function public.update_lesson_draft(
  uuid, text, text, text, jsonb, integer, jsonb, text
) to authenticated;
