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
begin
  if not public.has_app_role(array['content_editor','admin']::public.app_role[]) then
    raise exception 'insufficient_privilege';
  end if;

  if cardinality(coalesce(p_vocabulary_ids, array[]::text[])) > 500 then
    raise exception 'too_many_vocabulary_items_selected';
  end if;

  select coalesce(array_agg(normalized.id order by normalized.id), array[]::text[])
  into selected_ids
  from (
    select distinct btrim(input.raw_id) as id
    from unnest(coalesce(p_vocabulary_ids, array[]::text[])) as input(raw_id)
    where btrim(input.raw_id) <> ''
  ) normalized;

  if cardinality(selected_ids) = 0 then
    raise exception 'vocabulary_selection_required';
  end if;

  foreach vocabulary_id in array selected_ids loop
    perform public.delete_vocabulary_draft(vocabulary_id);
  end loop;

  return jsonb_build_object('deleted_count', cardinality(selected_ids));
end;
$$;

revoke all on function public.delete_vocabulary_drafts(text[]) from public;
grant execute on function public.delete_vocabulary_drafts(text[]) to authenticated;

comment on function public.delete_vocabulary_drafts(text[]) is
  'Atomically deletes authorized vocabulary drafts; rolls back the full selection when any item is not deletable.';
