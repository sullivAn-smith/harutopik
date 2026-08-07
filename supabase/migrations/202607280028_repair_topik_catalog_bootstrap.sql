-- The original bootstrap can run before the first content staff account exists.
-- Run it again idempotently after roles have been assigned so editors can create
-- lesson drafts against a valid course/module pair.
do $$
declare
  owner_id uuid;
begin
  select user_id into owner_id
  from public.user_roles
  where role in ('admin', 'content_editor')
  order by
    case when role = 'admin' then 0 else 1 end,
    granted_at
  limit 1;

  if owner_id is null then
    raise notice 'Catalog bootstrap skipped: no admin or content editor exists yet';
    return;
  end if;

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
end
$$;

grant execute on function public.create_lesson_draft(
  text, text, text, text, jsonb, integer, jsonb, text
) to authenticated;
