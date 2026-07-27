create table public.content_reviews (
  id bigint generated always as identity primary key,
  revision_id uuid not null references public.content_revisions(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id),
  decision text not null check (decision in ('changes_requested', 'approved')),
  comment text not null check (char_length(trim(comment)) between 3 and 2000),
  created_at timestamptz not null default now()
);

create index content_reviews_revision_idx
on public.content_reviews (revision_id, created_at desc);

create table public.content_releases (
  id bigint generated always as identity primary key,
  content_id text not null references public.content_entries(id) on delete restrict,
  revision_id uuid not null references public.content_revisions(id) on delete restrict,
  action text not null check (action in ('published', 'unpublished')),
  released_by uuid not null references auth.users(id),
  note text not null default '',
  released_at timestamptz not null default now()
);

create index content_releases_content_idx
on public.content_releases (content_id, released_at desc);

alter table public.content_reviews enable row level security;
alter table public.content_releases enable row level security;

create policy "Content staff read reviews"
on public.content_reviews for select
using (
  public.has_app_role(array['content_editor','admin']::public.app_role[])
);

create policy "Admins read releases"
on public.content_releases for select
using (public.has_app_role(array['admin']::public.app_role[]));

grant select on public.content_reviews to authenticated;
grant select on public.content_releases to authenticated;
grant usage, select on sequence public.content_reviews_id_seq to authenticated;
grant usage, select on sequence public.content_releases_id_seq to authenticated;

create or replace function public.transition_content_revision(
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
  select * into revision
  from public.content_revisions
  where id = p_revision_id
  for update;

  if not found then raise exception 'revision_not_found'; end if;

  if revision.status in ('draft', 'changes_requested')
    and p_target_status = 'in_review' then
    if not public.has_app_role(array['content_editor','admin']::public.app_role[]) then
      raise exception 'insufficient_privilege';
    end if;
    if revision.created_by <> (select auth.uid())
      and not public.has_app_role(array['admin']::public.app_role[]) then
      raise exception 'not_revision_owner';
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
    published_by = case when p_target_status = 'published' then (select auth.uid()) else published_by end,
    published_at = case when p_target_status = 'published' then now() else published_at end,
    updated_at = now()
  where id = p_revision_id;

  if p_target_status = 'published' then
    select * into entry from public.content_entries where id = revision.content_id;
    if entry.id is null then raise exception 'content_entry_not_found'; end if;

    insert into public.published_catalog (
      content_id, content_type, slug, parent_id, version, payload, published_at
    ) values (
      revision.content_id, revision.content_type, entry.slug, entry.parent_id,
      revision.version,
      jsonb_set(revision.payload, '{status}', '"published"'::jsonb, true),
      now()
    )
    on conflict (content_id) do update set
      content_type = excluded.content_type,
      slug = excluded.slug,
      parent_id = excluded.parent_id,
      version = excluded.version,
      payload = excluded.payload,
      published_at = excluded.published_at;

    insert into public.content_releases (
      content_id, revision_id, action, released_by
    ) values (
      revision.content_id, revision.id, 'published', (select auth.uid())
    );
  end if;

  insert into public.audit_logs (
    actor_id, action, entity_type, entity_id, metadata
  ) values (
    (select auth.uid()), 'content.workflow.transition', revision.content_type,
    revision.content_id,
    jsonb_build_object('revision_id', revision.id, 'from', revision.status, 'to', p_target_status)
  );

  return p_target_status;
end;
$$;

create function public.review_content_revision(
  p_revision_id uuid,
  p_decision text,
  p_comment text
)
returns public.content_workflow_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  revision public.content_revisions%rowtype;
  target public.content_workflow_status;
begin
  if not public.has_app_role(array['admin']::public.app_role[]) then
    raise exception 'insufficient_privilege';
  end if;
  if p_decision not in ('changes_requested', 'approved')
    or char_length(trim(p_comment)) < 3 then
    raise exception 'invalid_review';
  end if;

  select * into revision
  from public.content_revisions
  where id = p_revision_id
  for update;

  if not found then raise exception 'revision_not_found'; end if;
  if revision.status <> 'in_review' then raise exception 'revision_not_in_review'; end if;

  target := p_decision::public.content_workflow_status;
  update public.content_revisions
  set
    status = target,
    reviewed_by = (select auth.uid()),
    updated_at = now()
  where id = p_revision_id;

  insert into public.content_reviews (
    revision_id, reviewer_id, decision, comment
  ) values (
    p_revision_id, (select auth.uid()), p_decision, trim(p_comment)
  );

  insert into public.audit_logs (
    actor_id, action, entity_type, entity_id, metadata
  ) values (
    (select auth.uid()), 'content.review.' || p_decision, revision.content_type,
    revision.content_id,
    jsonb_build_object('revision_id', revision.id, 'comment', trim(p_comment))
  );

  return target;
end;
$$;

create function public.unpublish_content(
  p_revision_id uuid,
  p_note text default ''
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
  if revision.status <> 'published' then raise exception 'revision_not_published'; end if;

  delete from public.published_catalog where content_id = revision.content_id;
  update public.content_revisions
  set status = 'unpublished', updated_at = now()
  where id = p_revision_id;

  insert into public.content_releases (
    content_id, revision_id, action, released_by, note
  ) values (
    revision.content_id, revision.id, 'unpublished', (select auth.uid()), trim(p_note)
  );

  insert into public.audit_logs (
    actor_id, action, entity_type, entity_id, metadata
  ) values (
    (select auth.uid()), 'content.release.unpublished', revision.content_type,
    revision.content_id,
    jsonb_build_object('revision_id', revision.id, 'note', trim(p_note))
  );

  return 'unpublished';
end;
$$;

revoke all on function public.review_content_revision(uuid, text, text) from public;
grant execute on function public.review_content_revision(uuid, text, text) to authenticated;
revoke all on function public.unpublish_content(uuid, text) from public;
grant execute on function public.unpublish_content(uuid, text) to authenticated;

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

  update public.content_entries set
    slug = p_slug,
    parent_id = (
      select id from public.content_entries
      where id = p_module_id and content_type = 'module'
    ),
    title = p_title, sort_order = p_sort_order, updated_at = now()
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
