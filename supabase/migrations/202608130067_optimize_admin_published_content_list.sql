create index if not exists published_catalog_lesson_published_idx
on public.published_catalog (published_at desc)
where content_type = 'lesson';

create or replace function public.get_published_lesson_admin_summaries()
returns table (
  content_id text,
  slug text,
  version integer,
  title text,
  summary text,
  vocabulary_count integer,
  dictation_count integer,
  published_at timestamptz
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if not public.has_app_role(array['admin']::public.app_role[]) then
    raise exception 'Admin permission required' using errcode = '42501';
  end if;

  return query
  select
    catalog.content_id,
    catalog.slug,
    catalog.version,
    coalesce(catalog.payload -> 'title' ->> 'vi', catalog.content_id),
    coalesce(catalog.payload ->> 'summary', ''),
    case
      when jsonb_typeof(catalog.payload -> 'vocabulary') = 'array'
        then jsonb_array_length(catalog.payload -> 'vocabulary')
      else 0
    end,
    case
      when jsonb_typeof(catalog.payload -> 'exercises') = 'array' then (
        select count(*)::integer
        from jsonb_array_elements(catalog.payload -> 'exercises') exercise
        where exercise ->> 'type' = 'dictation'
      )
      else 0
    end,
    catalog.published_at
  from public.published_catalog catalog
  where catalog.content_type = 'lesson'
  order by catalog.published_at desc;
end;
$$;

revoke all on function public.get_published_lesson_admin_summaries() from public;
grant execute on function public.get_published_lesson_admin_summaries() to authenticated;
