do $$
declare
  owner_id uuid;
begin
  select user_id into owner_id
  from public.user_roles
  where role = 'admin'
  order by granted_at
  limit 1;

  if owner_id is null then
    select user_id into owner_id
    from public.user_roles
    where role = 'content_editor'
    order by granted_at
    limit 1;
  end if;

  if owner_id is null then return; end if;

  insert into public.content_entries (
    id, content_type, slug, parent_id, title, sort_order, created_by
  ) values (
    'course-topik-1',
    'course',
    'topik-1',
    null,
    '{"vi":"Tiếng Hàn sơ cấp 1","ko":"한국어 초급 1"}'::jsonb,
    1,
    owner_id
  )
  on conflict (id) do nothing;

  insert into public.content_entries (
    id, content_type, slug, parent_id, title, sort_order, created_by
  ) values (
    'module-topik-1-foundation',
    'module',
    'nen-tang',
    'course-topik-1',
    '{"vi":"Nền tảng TOPIK 1","ko":"TOPIK 1 기초"}'::jsonb,
    1,
    owner_id
  )
  on conflict (id) do nothing;

  insert into public.published_catalog (
    content_id, content_type, slug, parent_id, version, payload, published_at
  ) values (
    'course-topik-1',
    'course',
    'topik-1',
    null,
    1,
    '{
      "id":"course-topik-1",
      "slug":"topik-1",
      "title":{"vi":"Tiếng Hàn sơ cấp 1","ko":"한국어 초급 1"},
      "summary":"Lộ trình nền tảng dành cho người Việt bắt đầu học tiếng Hàn và chuẩn bị TOPIK I.",
      "level":"beginner",
      "lessonCount":15,
      "status":"published"
    }'::jsonb,
    now()
  )
  on conflict (content_id) do update set
    payload = excluded.payload,
    published_at = excluded.published_at;

  insert into public.published_catalog (
    content_id, content_type, slug, parent_id, version, payload, published_at
  ) values (
    'module-topik-1-foundation',
    'module',
    'nen-tang',
    'course-topik-1',
    1,
    '{
      "id":"module-topik-1-foundation",
      "courseId":"course-topik-1",
      "slug":"nen-tang",
      "title":{"vi":"Nền tảng TOPIK 1","ko":"TOPIK 1 기초"},
      "status":"published"
    }'::jsonb,
    now()
  )
  on conflict (content_id) do update set
    parent_id = excluded.parent_id,
    payload = excluded.payload,
    published_at = excluded.published_at;
end
$$;

create or replace function public.create_lesson_draft(
  p_content_id text,
  p_slug text,
  p_course_id text,
  p_module_id text,
  p_title jsonb,
  p_sort_order integer,
  p_payload jsonb,
  p_change_summary text default ''
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  revision_id uuid;
  module_entry public.content_entries%rowtype;
begin
  if not public.has_app_role(array['content_editor','admin']::public.app_role[]) then
    raise exception 'insufficient_privilege';
  end if;
  if p_payload->>'id' is distinct from p_content_id
    or p_payload->>'slug' is distinct from p_slug
    or p_payload->>'courseId' is distinct from p_course_id
    or p_payload->>'moduleId' is distinct from p_module_id then
    raise exception 'payload_identity_mismatch';
  end if;

  select * into module_entry
  from public.content_entries
  where id = p_module_id
    and content_type = 'module'
    and parent_id = p_course_id;
  if not found then raise exception 'invalid_course_module'; end if;

  insert into public.content_entries (
    id, content_type, slug, parent_id, title, sort_order, created_by
  ) values (
    p_content_id, 'lesson', p_slug, p_module_id, p_title, p_sort_order,
    (select auth.uid())
  );

  insert into public.content_revisions (
    content_id, content_type, version, status, payload,
    change_summary, created_by
  ) values (
    p_content_id, 'lesson', 1, 'draft', p_payload,
    nullif(trim(p_change_summary), ''), (select auth.uid())
  )
  returning id into revision_id;

  insert into public.audit_logs (
    actor_id, action, entity_type, entity_id, metadata
  ) values (
    (select auth.uid()), 'content.lesson.draft_created', 'lesson', p_content_id,
    jsonb_build_object(
      'revision_id', revision_id,
      'course_id', p_course_id,
      'module_id', p_module_id
    )
  );
  return revision_id;
end;
$$;

create or replace function public.update_lesson_draft(
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
  select * into revision from public.content_revisions
  where id = p_revision_id for update;
  if not found then raise exception 'revision_not_found'; end if;
  if revision.content_type <> 'lesson'
    or revision.status not in ('draft', 'changes_requested') then
    raise exception 'revision_not_editable';
  end if;
  if revision.created_by <> (select auth.uid())
    and not public.has_app_role(array['admin']::public.app_role[]) then
    raise exception 'not_revision_owner';
  end if;
  if p_payload->>'id' <> revision.content_id::text then
    raise exception 'content_id_mismatch';
  end if;
  if not exists (
    select 1 from public.content_entries
    where id = p_module_id
      and content_type = 'module'
      and parent_id = p_course_id
  ) then raise exception 'invalid_course_module'; end if;

  update public.content_entries set
    slug = p_slug,
    parent_id = p_module_id,
    title = p_title,
    sort_order = p_sort_order,
    updated_at = now()
  where id = revision.content_id;

  update public.content_revisions set
    payload = p_payload,
    status = 'draft',
    change_summary = nullif(trim(p_change_summary), ''),
    updated_at = now()
  where id = p_revision_id;

  insert into public.audit_logs (
    actor_id, action, entity_type, entity_id, metadata
  ) values (
    (select auth.uid()), 'content.draft.update', 'lesson', revision.content_id,
    jsonb_build_object('revision_id', p_revision_id)
  );
  return p_revision_id;
end;
$$;
