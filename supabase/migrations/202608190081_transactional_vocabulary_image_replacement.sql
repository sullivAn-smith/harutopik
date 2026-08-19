create or replace function public.replace_vocabulary_image_url(
  p_vocabulary_id text,
  p_old_url text,
  p_new_url text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  master_count integer;
  revision_count integer;
  catalog_count integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'SERVICE_ROLE_REQUIRED';
  end if;
  if nullif(trim(p_vocabulary_id), '') is null
    or nullif(trim(p_old_url), '') is null
    or nullif(trim(p_new_url), '') is null then
    raise exception 'INVALID_IMAGE_REPLACEMENT';
  end if;

  update public.vocabulary_items
  set image_url = p_new_url, updated_at = now()
  where id = p_vocabulary_id and image_url = p_old_url;
  get diagnostics master_count = row_count;
  if master_count <> 1 then
    raise exception 'VOCABULARY_IMAGE_CHANGED';
  end if;

  update public.content_revisions revision
  set payload = jsonb_set(
    revision.payload,
    '{vocabulary}',
    (
      select jsonb_agg(
        case
          when item.value ->> 'id' = p_vocabulary_id
            then jsonb_set(item.value, '{imageUrl}', to_jsonb(p_new_url), true)
          else item.value
        end
        order by item.position
      )
      from jsonb_array_elements(revision.payload -> 'vocabulary')
        with ordinality as item(value, position)
    ),
    true
  ), updated_at = now()
  where revision.content_type = 'lesson'
    and jsonb_typeof(revision.payload -> 'vocabulary') = 'array'
    and exists (
      select 1
      from jsonb_array_elements(revision.payload -> 'vocabulary') entry
      where entry ->> 'id' = p_vocabulary_id
    );
  get diagnostics revision_count = row_count;

  update public.published_catalog catalog
  set payload = jsonb_set(
    catalog.payload,
    '{vocabulary}',
    (
      select jsonb_agg(
        case
          when item.value ->> 'id' = p_vocabulary_id
            then jsonb_set(item.value, '{imageUrl}', to_jsonb(p_new_url), true)
          else item.value
        end
        order by item.position
      )
      from jsonb_array_elements(catalog.payload -> 'vocabulary')
        with ordinality as item(value, position)
    ),
    true
  ), published_at = now()
  where catalog.content_type = 'lesson'
    and jsonb_typeof(catalog.payload -> 'vocabulary') = 'array'
    and exists (
      select 1
      from jsonb_array_elements(catalog.payload -> 'vocabulary') entry
      where entry ->> 'id' = p_vocabulary_id
    );
  get diagnostics catalog_count = row_count;

  return jsonb_build_object(
    'masterRows', master_count,
    'revisionRows', revision_count,
    'catalogRows', catalog_count
  );
end;
$$;

revoke all on function public.replace_vocabulary_image_url(text, text, text) from public;
grant execute on function public.replace_vocabulary_image_url(text, text, text) to service_role;
