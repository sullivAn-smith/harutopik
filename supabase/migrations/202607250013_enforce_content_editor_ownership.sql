drop policy if exists "Editors update catalog entries"
on public.content_entries;

create policy "Editors update own catalog entries"
on public.content_entries for update
using (
  created_by = (select auth.uid())
  or public.has_app_role(array['admin']::public.app_role[])
)
with check (
  created_by = (select auth.uid())
  or public.has_app_role(array['admin']::public.app_role[])
);

drop policy if exists "Editors update and submit drafts"
on public.content_revisions;

create policy "Editors update and submit own drafts"
on public.content_revisions for update
using (
  status = 'draft'
  and (
    created_by = (select auth.uid())
    or public.has_app_role(array['admin']::public.app_role[])
  )
)
with check (
  status in ('draft', 'in_review')
  and (
    created_by = (select auth.uid())
    or public.has_app_role(array['admin']::public.app_role[])
  )
);
