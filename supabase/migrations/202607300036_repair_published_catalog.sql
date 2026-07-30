-- Repair legacy rows whose revision was marked as published before the
-- production catalog was synchronized. The newest published revision wins.
with latest_published as (
  select distinct on (revision.content_id)
    revision.content_id,
    revision.content_type,
    revision.version,
    revision.payload,
    revision.published_at,
    entry.slug,
    entry.parent_id
  from public.content_revisions revision
  join public.content_entries entry on entry.id = revision.content_id
  where revision.status = 'published'
    and revision.deleted_at is null
  order by
    revision.content_id,
    revision.version desc,
    revision.updated_at desc
)
insert into public.published_catalog (
  content_id,
  content_type,
  slug,
  parent_id,
  version,
  payload,
  published_at
)
select
  content_id,
  content_type,
  slug,
  parent_id,
  version,
  jsonb_set(payload, '{status}', '"published"'::jsonb, true),
  coalesce(published_at, now())
from latest_published
on conflict (content_id) do update set
  content_type = excluded.content_type,
  slug = excluded.slug,
  parent_id = excluded.parent_id,
  version = excluded.version,
  payload = excluded.payload,
  published_at = excluded.published_at;
