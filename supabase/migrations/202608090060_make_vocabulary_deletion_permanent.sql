-- Vocabulary deletion must remove the master record, not only hide it from
-- the current page. Dependent child rows cascade from vocabulary_items.
-- Stale lesson_vocabulary projections are safe to remove only when the lesson
-- is no longer present in the published catalog.

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
  deleted_count integer := 0;
begin
  if not public.has_app_role(
    array['content_editor','admin']::public.app_role[]
  ) then
    raise exception 'insufficient_privilege';
  end if;

  select vocabulary.* into item
  from public.vocabulary_items vocabulary
  where vocabulary.id = p_vocabulary_id
  for update;

  if not found then
    raise exception 'vocabulary_not_found';
  end if;
  if item.status not in ('draft', 'changes_requested') then
    raise exception 'published_vocabulary_cannot_delete';
  end if;
  if item.created_by <> (select auth.uid())
    and not public.has_app_role(array['admin']::public.app_role[]) then
    raise exception 'not_vocabulary_owner';
  end if;

  select string_agg(
    distinct coalesce(revision.payload->'title'->>'vi', revision.content_id),
    ', '
  )
  into dependent_lessons
  from public.content_revisions revision
  where revision.content_type = 'lesson'
    and revision.deleted_at is null
    and revision.status in (
      'draft', 'changes_requested', 'in_review', 'approved'
    )
    and coalesce(revision.payload->'vocabulary', '[]'::jsonb)
      @> jsonb_build_array(jsonb_build_object('id', p_vocabulary_id));

  if dependent_lessons is not null then
    raise exception 'vocabulary_used_by_lessons:%', dependent_lessons;
  end if;

  select string_agg(
    distinct coalesce(catalog.payload->'title'->>'vi', catalog.content_id),
    ', '
  )
  into dependent_lessons
  from public.lesson_vocabulary lesson_word
  join public.published_catalog catalog
    on catalog.content_id = lesson_word.lesson_id
   and catalog.content_type = 'lesson'
  where lesson_word.vocabulary_id = p_vocabulary_id;

  if dependent_lessons is not null then
    raise exception 'vocabulary_used_by_lessons:%', dependent_lessons;
  end if;

  -- Old unpublish workflows could leave a derived link behind. It is not
  -- learner-visible anymore and must not prevent permanent draft deletion.
  delete from public.lesson_vocabulary lesson_word
  where lesson_word.vocabulary_id = p_vocabulary_id
    and not exists (
      select 1
      from public.published_catalog catalog
      where catalog.content_id = lesson_word.lesson_id
        and catalog.content_type = 'lesson'
    );

  update public.content_import_rows
  set imported_vocabulary_id = null
  where imported_vocabulary_id = p_vocabulary_id;

  delete from public.vocabulary_items
  where id = p_vocabulary_id;

  get diagnostics deleted_count = row_count;
  if deleted_count <> 1 or exists (
    select 1
    from public.vocabulary_items
    where id = p_vocabulary_id
  ) then
    raise exception 'vocabulary_delete_failed';
  end if;

  insert into public.audit_logs (
    actor_id, action, entity_type, entity_id, metadata
  ) values (
    (select auth.uid()),
    'vocabulary.draft.deleted',
    'vocabulary',
    p_vocabulary_id,
    jsonb_build_object(
      'hangul', item.hangul,
      'deletion_mode', 'permanent'
    )
  );

  return 'deleted';
end;
$$;

revoke all on function public.delete_vocabulary_draft(text) from public;
grant execute on function public.delete_vocabulary_draft(text) to authenticated;

create or replace function public.delete_vocabulary_drafts(
  p_vocabulary_ids text[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_ids text[];
  vocabulary_id text;
  deletion_result text;
  remaining_count integer := 0;
begin
  if not public.has_app_role(
    array['content_editor','admin']::public.app_role[]
  ) then
    raise exception 'insufficient_privilege';
  end if;

  if cardinality(coalesce(p_vocabulary_ids, array[]::text[])) > 500 then
    raise exception 'too_many_vocabulary_items_selected';
  end if;

  select coalesce(
    array_agg(normalized.id order by normalized.id),
    array[]::text[]
  )
  into selected_ids
  from (
    select distinct btrim(input.raw_id) as id
    from unnest(
      coalesce(p_vocabulary_ids, array[]::text[])
    ) as input(raw_id)
    where btrim(input.raw_id) <> ''
  ) normalized;

  if cardinality(selected_ids) = 0 then
    raise exception 'vocabulary_selection_required';
  end if;

  foreach vocabulary_id in array selected_ids loop
    deletion_result := public.delete_vocabulary_draft(vocabulary_id);
    if deletion_result is distinct from 'deleted' then
      raise exception 'vocabulary_delete_failed';
    end if;
  end loop;

  select count(*) into remaining_count
  from public.vocabulary_items vocabulary
  where vocabulary.id = any(selected_ids);

  if remaining_count > 0 then
    raise exception 'vocabulary_delete_incomplete';
  end if;

  return jsonb_build_object(
    'deleted_count', cardinality(selected_ids),
    'deleted_ids', to_jsonb(selected_ids)
  );
end;
$$;

revoke all on function public.delete_vocabulary_drafts(text[]) from public;
grant execute on function public.delete_vocabulary_drafts(text[]) to authenticated;

comment on function public.delete_vocabulary_drafts(text[]) is
  'Permanently and atomically deletes authorized vocabulary drafts, then verifies that no selected record remains.';
