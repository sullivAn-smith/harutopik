create function public.create_course_structure(
  p_id text,
  p_slug text,
  p_title_vi text,
  p_title_ko text,
  p_summary text,
  p_level text,
  p_lesson_count integer
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_app_role(array['admin']::public.app_role[]) then
    raise exception 'insufficient_privilege';
  end if;
  if p_id !~ '^[a-z0-9][a-z0-9-]*$'
    or p_slug !~ '^[a-z0-9][a-z0-9-]*$'
    or char_length(trim(p_title_vi)) < 2
    or char_length(trim(p_title_ko)) < 1
    or p_lesson_count < 1 then
    raise exception 'invalid_course';
  end if;

  insert into public.content_entries (
    id, content_type, slug, parent_id, title, sort_order, created_by
  ) values (
    p_id, 'course', p_slug, null,
    jsonb_build_object('vi', trim(p_title_vi), 'ko', trim(p_title_ko)),
    coalesce((select max(sort_order) + 1 from public.content_entries where content_type = 'course'), 1),
    (select auth.uid())
  );

  insert into public.published_catalog (
    content_id, content_type, slug, parent_id, version, payload
  ) values (
    p_id, 'course', p_slug, null, 1,
    jsonb_build_object(
      'id', p_id,
      'slug', p_slug,
      'title', jsonb_build_object('vi', trim(p_title_vi), 'ko', trim(p_title_ko)),
      'summary', trim(p_summary),
      'level', coalesce(nullif(trim(p_level), ''), 'beginner'),
      'lessonCount', p_lesson_count,
      'status', 'published'
    )
  );

  insert into public.audit_logs (
    actor_id, action, entity_type, entity_id, metadata
  ) values (
    (select auth.uid()), 'catalog.course.created', 'course', p_id,
    jsonb_build_object('slug', p_slug)
  );
  return p_id;
end;
$$;

create function public.create_module_structure(
  p_id text,
  p_course_id text,
  p_slug text,
  p_title_vi text,
  p_title_ko text,
  p_sort_order integer
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_app_role(array['admin']::public.app_role[]) then
    raise exception 'insufficient_privilege';
  end if;
  if not exists (
    select 1 from public.content_entries
    where id = p_course_id and content_type = 'course'
  ) then raise exception 'course_not_found'; end if;
  if p_id !~ '^[a-z0-9][a-z0-9-]*$'
    or p_slug !~ '^[a-z0-9][a-z0-9-]*$'
    or char_length(trim(p_title_vi)) < 2
    or char_length(trim(p_title_ko)) < 1
    or p_sort_order < 1 then
    raise exception 'invalid_module';
  end if;

  insert into public.content_entries (
    id, content_type, slug, parent_id, title, sort_order, created_by
  ) values (
    p_id, 'module', p_slug, p_course_id,
    jsonb_build_object('vi', trim(p_title_vi), 'ko', trim(p_title_ko)),
    p_sort_order, (select auth.uid())
  );

  insert into public.published_catalog (
    content_id, content_type, slug, parent_id, version, payload
  ) values (
    p_id, 'module', p_slug, p_course_id, 1,
    jsonb_build_object(
      'id', p_id,
      'courseId', p_course_id,
      'slug', p_slug,
      'title', jsonb_build_object('vi', trim(p_title_vi), 'ko', trim(p_title_ko)),
      'status', 'published'
    )
  );

  insert into public.audit_logs (
    actor_id, action, entity_type, entity_id, metadata
  ) values (
    (select auth.uid()), 'catalog.module.created', 'module', p_id,
    jsonb_build_object('course_id', p_course_id, 'slug', p_slug)
  );
  return p_id;
end;
$$;

revoke all on function public.create_course_structure(
  text,text,text,text,text,text,integer
) from public;
grant execute on function public.create_course_structure(
  text,text,text,text,text,text,integer
) to authenticated;

revoke all on function public.create_module_structure(
  text,text,text,text,text,integer
) from public;
grant execute on function public.create_module_structure(
  text,text,text,text,text,integer
) to authenticated;
