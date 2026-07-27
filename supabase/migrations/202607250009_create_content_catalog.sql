create table public.content_entries (
  id text primary key check (
    char_length(id) between 3 and 200
    and id ~ '^[a-z0-9][a-z0-9-]*$'
  ),
  content_type text not null check (
    content_type in ('course', 'module', 'lesson')
  ),
  slug text not null check (
    char_length(slug) between 2 and 120
    and slug ~ '^[a-z0-9][a-z0-9-]*$'
  ),
  parent_id text references public.content_entries(id) on delete restrict,
  title jsonb not null check (
    jsonb_typeof(title) = 'object'
    and title ? 'vi'
    and title ? 'ko'
  ),
  sort_order integer not null default 1 check (sort_order > 0),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index content_entries_root_slug_idx
on public.content_entries (content_type, slug)
where parent_id is null;

create unique index content_entries_parent_slug_idx
on public.content_entries (content_type, parent_id, slug)
where parent_id is not null;

create index content_entries_tree_idx
on public.content_entries (parent_id, sort_order);

create table public.published_catalog (
  content_id text primary key references public.content_entries(id) on delete cascade,
  content_type text not null check (
    content_type in ('course', 'module', 'lesson')
  ),
  slug text not null,
  parent_id text,
  version integer not null check (version > 0),
  payload jsonb not null,
  published_at timestamptz not null default now()
);

create index published_catalog_tree_idx
on public.published_catalog (content_type, parent_id, slug);

alter table public.content_entries enable row level security;
alter table public.published_catalog enable row level security;

create policy "Content staff read catalog entries"
on public.content_entries for select
using (
  public.has_app_role(
    array['content_editor','content_reviewer','admin']::public.app_role[]
  )
);

create policy "Editors create catalog entries"
on public.content_entries for insert
with check (
  created_by = (select auth.uid())
  and public.has_app_role(
    array['content_editor','admin']::public.app_role[]
  )
);

create policy "Editors update catalog entries"
on public.content_entries for update
using (
  public.has_app_role(
    array['content_editor','admin']::public.app_role[]
  )
)
with check (
  public.has_app_role(
    array['content_editor','admin']::public.app_role[]
  )
);

create policy "Everyone reads published catalog"
on public.published_catalog for select
using (true);

drop policy if exists "Editors create drafts"
on public.content_revisions;

create policy "Editors create drafts"
on public.content_revisions for insert
with check (
  created_by = (select auth.uid())
  and status = 'draft'
  and public.has_app_role(
    array['content_editor','admin']::public.app_role[]
  )
);

drop policy if exists "Editors update and submit drafts"
on public.content_revisions;

create policy "Editors update and submit drafts"
on public.content_revisions for update
using (
  status = 'draft'
  and public.has_app_role(
    array['content_editor','admin']::public.app_role[]
  )
)
with check (
  status in ('draft', 'in_review')
  and public.has_app_role(
    array['content_editor','admin']::public.app_role[]
  )
);

create policy "Content staff write their own audit events"
on public.audit_logs for insert
with check (
  actor_id = (select auth.uid())
  and public.has_app_role(
    array['content_editor','content_reviewer','admin']::public.app_role[]
  )
);

grant select, insert, update
on public.content_entries
to authenticated;

grant select
on public.published_catalog
to anon, authenticated;

grant insert
on public.audit_logs
to authenticated;

create function public.create_lesson_draft(
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
security invoker
set search_path = ''
as $$
declare
  revision_id uuid;
begin
  if not public.has_app_role(
    array['content_editor','admin']::public.app_role[]
  ) then
    raise exception 'insufficient_privilege';
  end if;

  if p_payload ->> 'id' is distinct from p_content_id
    or p_payload ->> 'slug' is distinct from p_slug
    or p_payload ->> 'courseId' is distinct from p_course_id
    or p_payload ->> 'moduleId' is distinct from p_module_id then
    raise exception 'payload_identity_mismatch';
  end if;

  insert into public.content_entries (
    id, content_type, slug, parent_id, title, sort_order, created_by
  )
  values (
    p_content_id,
    'lesson',
    p_slug,
    (
      select id
      from public.content_entries
      where id = p_module_id and content_type = 'module'
    ),
    p_title,
    p_sort_order,
    (select auth.uid())
  );

  insert into public.content_revisions (
    content_id, content_type, version, status, payload,
    change_summary, created_by
  )
  values (
    p_content_id, 'lesson', 1, 'draft', p_payload,
    p_change_summary, (select auth.uid())
  )
  returning id into revision_id;

  insert into public.audit_logs (
    actor_id, action, entity_type, entity_id, metadata
  )
  values (
    (select auth.uid()),
    'content.lesson.draft_created',
    'lesson',
    p_content_id,
    jsonb_build_object(
      'revision_id', revision_id,
      'course_id', p_course_id,
      'module_id', p_module_id
    )
  );

  return revision_id;
end;
$$;

revoke all on function public.create_lesson_draft(
  text, text, text, text, jsonb, integer, jsonb, text
) from public;

grant execute on function public.create_lesson_draft(
  text, text, text, text, jsonb, integer, jsonb, text
) to authenticated;
