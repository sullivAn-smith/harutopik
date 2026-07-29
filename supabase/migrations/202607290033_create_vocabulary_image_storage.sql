insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'vocabulary-images',
  'vocabulary-images',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Public reads vocabulary images"
on storage.objects
for select
using (bucket_id = 'vocabulary-images');

create policy "Editors upload vocabulary images to their folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'vocabulary-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and public.has_app_role(
    array['content_editor', 'admin']::public.app_role[]
  )
);

create policy "Editors update vocabulary images in permitted folders"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'vocabulary-images'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or public.has_app_role(array['admin']::public.app_role[])
  )
  and public.has_app_role(
    array['content_editor', 'admin']::public.app_role[]
  )
)
with check (
  bucket_id = 'vocabulary-images'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or public.has_app_role(array['admin']::public.app_role[])
  )
  and public.has_app_role(
    array['content_editor', 'admin']::public.app_role[]
  )
);

create policy "Editors delete vocabulary images in permitted folders"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'vocabulary-images'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or public.has_app_role(array['admin']::public.app_role[])
  )
  and public.has_app_role(
    array['content_editor', 'admin']::public.app_role[]
  )
);
