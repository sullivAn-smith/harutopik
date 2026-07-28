alter table public.content_revisions
add column if not exists deleted_at timestamptz,
add column if not exists deleted_by uuid references auth.users(id);

create or replace function public.delete_vocabulary_draft(
  p_vocabulary_id text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  item public.vocabulary_items%rowtype;
  dependent_lessons text;
begin
  if not public.has_app_role(array['content_editor','admin']::public.app_role[]) then
    raise exception 'insufficient_privilege';
  end if;

  select * into item
  from public.vocabulary_items
  where id = p_vocabulary_id
  for update;

  if not found then raise exception 'vocabulary_not_found'; end if;
  if item.status not in ('draft', 'changes_requested') then
    raise exception 'published_vocabulary_cannot_delete';
  end if;
  if item.created_by <> (select auth.uid())
    and not public.has_app_role(array['admin']::public.app_role[]) then
    raise exception 'not_vocabulary_owner';
  end if;

  select string_agg(
    coalesce(revision.payload->'title'->>'vi', revision.content_id),
    ', '
    order by revision.updated_at desc
  )
  into dependent_lessons
  from public.content_revisions revision
  where revision.content_type = 'lesson'
    and revision.deleted_at is null
    and revision.status in ('draft', 'changes_requested', 'in_review', 'approved')
    and coalesce(revision.payload->'vocabulary', '[]'::jsonb)
      @> jsonb_build_array(jsonb_build_object('id', p_vocabulary_id));

  if dependent_lessons is not null then
    raise exception 'vocabulary_used_by_lessons:%', dependent_lessons;
  end if;

  update public.content_import_rows
  set imported_vocabulary_id = null
  where imported_vocabulary_id = p_vocabulary_id;

  delete from public.vocabulary_items where id = p_vocabulary_id;

  insert into public.audit_logs (
    actor_id, action, entity_type, entity_id, metadata
  ) values (
    (select auth.uid()), 'vocabulary.draft.deleted', 'vocabulary',
    p_vocabulary_id, jsonb_build_object('hangul', item.hangul)
  );

  return 'deleted';
end;
$$;

revoke all on function public.delete_vocabulary_draft(text) from public;
grant execute on function public.delete_vocabulary_draft(text) to authenticated;

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
begin
  if not public.has_app_role(array['content_editor','admin']::public.app_role[]) then
    raise exception 'insufficient_privilege';
  end if;

  select * into revision
  from public.content_revisions
  where id = p_revision_id
  for update;

  if not found then raise exception 'revision_not_found'; end if;
  if revision.content_type <> 'lesson' then raise exception 'invalid_content_type'; end if;
  if revision.created_by <> (select auth.uid())
    and not public.has_app_role(array['admin']::public.app_role[]) then
    raise exception 'not_revision_owner';
  end if;
  if revision.status in ('in_review', 'approved', 'published') then
    raise exception 'active_revision_cannot_delete';
  end if;

  select exists (
    select 1 from public.content_releases
    where content_id = revision.content_id
  ) into has_release;

  if has_release or revision.status in ('unpublished', 'archived') then
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
      (select auth.uid()), 'content.lesson.archived', 'lesson',
      revision.content_id, jsonb_build_object('revision_id', revision.id)
    );
    return 'archived';
  end if;

  if revision.status not in ('draft', 'changes_requested') then
    raise exception 'revision_not_deletable';
  end if;

  delete from public.content_revisions
  where content_id = revision.content_id;
  delete from public.content_entries
  where id = revision.content_id and content_type = 'lesson';

  insert into public.audit_logs (
    actor_id, action, entity_type, entity_id, metadata
  ) values (
    (select auth.uid()), 'content.lesson.deleted', 'lesson',
    revision.content_id, jsonb_build_object('revision_id', revision.id)
  );
  return 'deleted';
end;
$$;

revoke all on function public.delete_or_archive_lesson(uuid) from public;
grant execute on function public.delete_or_archive_lesson(uuid) to authenticated;

create or replace function public.prepare_admin_revision_edit(
  p_revision_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  revision public.content_revisions%rowtype;
  editable_revision_id uuid;
begin
  if not public.has_app_role(array['admin']::public.app_role[]) then
    raise exception 'insufficient_privilege';
  end if;

  select * into revision
  from public.content_revisions
  where id = p_revision_id
  for update;
  if not found then raise exception 'revision_not_found'; end if;
  if revision.content_type <> 'lesson' then raise exception 'invalid_content_type'; end if;

  if revision.status in ('draft', 'changes_requested') then
    return revision.id;
  end if;

  if revision.status in ('in_review', 'approved') then
    update public.content_revisions
    set
      status = 'draft',
      payload = jsonb_set(payload, '{status}', '"draft"'::jsonb, true),
      updated_at = now()
    where id = revision.id;
    editable_revision_id := revision.id;
  elsif revision.status in ('published', 'unpublished', 'archived') then
    editable_revision_id := public.create_new_content_revision(
      revision.id,
      'Admin tạo phiên bản để chỉnh sửa nhanh'
    );
  else
    raise exception 'revision_not_editable';
  end if;

  insert into public.audit_logs (
    actor_id, action, entity_type, entity_id, metadata
  ) values (
    (select auth.uid()), 'content.admin.quick_edit_started', 'lesson',
    revision.content_id,
    jsonb_build_object(
      'source_revision_id', revision.id,
      'editable_revision_id', editable_revision_id,
      'source_status', revision.status
    )
  );
  return editable_revision_id;
end;
$$;

revoke all on function public.prepare_admin_revision_edit(uuid) from public;
grant execute on function public.prepare_admin_revision_edit(uuid) to authenticated;

create or replace function public.create_course_structure(
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
  if not public.has_app_role(array['content_editor','admin']::public.app_role[]) then
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

create or replace function public.create_module_structure(
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
  if not public.has_app_role(array['content_editor','admin']::public.app_role[]) then
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
