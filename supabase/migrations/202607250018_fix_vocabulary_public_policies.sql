drop policy if exists "Published vocabulary is readable"
on public.vocabulary_items;

create policy "Public reads published vocabulary"
on public.vocabulary_items for select
using (status = 'published');

create policy "Content staff reads all vocabulary"
on public.vocabulary_items for select
to authenticated
using (
  public.has_app_role(array['content_editor','admin']::public.app_role[])
);

drop policy if exists "Published lesson vocabulary is readable"
on public.lesson_vocabulary;

create policy "Public reads published lesson vocabulary"
on public.lesson_vocabulary for select
using (
  exists (
    select 1 from public.published_catalog catalog
    where catalog.content_id = lesson_vocabulary.lesson_id
      and catalog.content_type = 'lesson'
  )
);

create policy "Content staff reads all lesson vocabulary"
on public.lesson_vocabulary for select
to authenticated
using (
  public.has_app_role(array['content_editor','admin']::public.app_role[])
);

grant all privileges
on public.vocabulary_items, public.vocabulary_meanings,
  public.vocabulary_accepted_answers, public.vocabulary_examples,
  public.lesson_vocabulary
to service_role;

grant usage, select
on all sequences in schema public
to service_role;
