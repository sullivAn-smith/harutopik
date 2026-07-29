create function public.update_lesson_in_review(
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
  if not public.has_app_role(array['admin']::public.app_role[]) then
    raise exception 'insufficient_privilege';
  end if;

  select * into revision
  from public.content_revisions
  where id = p_revision_id
  for update;

  if not found then raise exception 'revision_not_found'; end if;
  if revision.content_type <> 'lesson' or revision.status <> 'in_review' then
    raise exception 'revision_not_in_review';
  end if;
  if p_payload->>'id' <> revision.content_id then
    raise exception 'content_id_mismatch';
  end if;
  if not exists (
    select 1 from public.content_entries course
    join public.content_entries module
      on module.parent_id = course.id
     and module.id = p_module_id
     and module.content_type = 'module'
    where course.id = p_course_id
      and course.content_type = 'course'
  ) then
    raise exception 'invalid_course_module';
  end if;

  update public.content_entries
  set
    slug = p_slug,
    parent_id = p_module_id,
    title = p_title,
    sort_order = p_sort_order,
    updated_at = now()
  where id = revision.content_id;

  update public.content_revisions
  set
    payload = p_payload,
    change_summary = coalesce(nullif(trim(p_change_summary), ''), change_summary),
    updated_at = now()
  where id = p_revision_id;

  insert into public.audit_logs (
    actor_id, action, entity_type, entity_id, metadata
  ) values (
    (select auth.uid()),
    'content.review.quick_edit',
    'lesson',
    revision.content_id,
    jsonb_build_object(
      'revision_id', p_revision_id,
      'change_summary', nullif(trim(p_change_summary), '')
    )
  );

  return p_revision_id;
end;
$$;

revoke all on function public.update_lesson_in_review(
  uuid, text, text, text, jsonb, integer, jsonb, text
) from public;
grant execute on function public.update_lesson_in_review(
  uuid, text, text, text, jsonb, integer, jsonb, text
) to authenticated;
