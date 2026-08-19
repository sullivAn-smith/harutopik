create or replace function public.get_published_catalog_shells()
returns table (
  content_id text,
  content_type text,
  parent_id text,
  payload jsonb
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    catalog.content_id,
    catalog.content_type,
    catalog.parent_id,
    case
      when catalog.content_type <> 'lesson' then catalog.payload
      else jsonb_build_object(
        'id', catalog.content_id,
        'slug', catalog.slug,
        'courseId', catalog.payload -> 'courseId',
        'moduleId', catalog.payload -> 'moduleId',
        'order', catalog.payload -> 'order',
        'version', catalog.version,
        'status', 'published',
        'title', catalog.payload -> 'title',
        'summary', catalog.payload -> 'summary',
        'objectives', coalesce(catalog.payload -> 'objectives', '[]'::jsonb),
        'vocabulary', '[]'::jsonb,
        'grammar', '[]'::jsonb,
        'exercises', '[]'::jsonb
      )
    end as payload
  from public.published_catalog catalog
  order by catalog.content_type, catalog.parent_id nulls first, catalog.slug;
$$;

revoke all on function public.get_published_catalog_shells() from public;
grant execute on function public.get_published_catalog_shells() to anon, authenticated, service_role;
