create table public.vocabulary_items (
  id text primary key check (
    char_length(id) between 1 and 200
    and id ~ '^[a-z0-9][a-z0-9-]*$'
  ),
  hangul text not null check (char_length(trim(hangul)) between 1 and 200),
  normalized_hangul text not null check (char_length(trim(normalized_hangul)) between 1 and 200),
  romanization text not null default '',
  primary_meaning_vi text not null check (char_length(trim(primary_meaning_vi)) between 1 and 500),
  part_of_speech text,
  level text not null default 'beginner',
  category text not null default 'general',
  audio_url text,
  image_url text,
  status public.content_workflow_status not null default 'draft',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index vocabulary_items_natural_key_idx
on public.vocabulary_items (
  normalized_hangul,
  coalesce(part_of_speech, ''),
  lower(primary_meaning_vi)
);

create index vocabulary_items_discovery_idx
on public.vocabulary_items (status, level, category, normalized_hangul);

create table public.vocabulary_meanings (
  id uuid primary key default gen_random_uuid(),
  vocabulary_id text not null references public.vocabulary_items(id) on delete cascade,
  meaning_vi text not null check (char_length(trim(meaning_vi)) between 1 and 500),
  is_primary boolean not null default false,
  context text not null default '',
  position integer not null default 1 check (position > 0),
  unique (vocabulary_id, position)
);

create unique index vocabulary_meanings_one_primary_idx
on public.vocabulary_meanings (vocabulary_id)
where is_primary;

create table public.vocabulary_accepted_answers (
  id uuid primary key default gen_random_uuid(),
  vocabulary_id text not null references public.vocabulary_items(id) on delete cascade,
  direction text not null check (direction in ('ko_vi', 'vi_ko')),
  answer text not null check (char_length(trim(answer)) between 1 and 500),
  normalized_answer text not null check (char_length(trim(normalized_answer)) between 1 and 500),
  unique (vocabulary_id, direction, normalized_answer)
);

create table public.vocabulary_examples (
  id text primary key check (char_length(id) between 1 and 240),
  vocabulary_id text not null references public.vocabulary_items(id) on delete cascade,
  korean text not null check (char_length(trim(korean)) between 1 and 1000),
  vietnamese text not null check (char_length(trim(vietnamese)) between 1 and 1000),
  audio_url text,
  position integer not null default 1 check (position > 0),
  unique (vocabulary_id, position)
);

create table public.lesson_vocabulary (
  lesson_id text not null references public.content_entries(id) on delete cascade,
  vocabulary_id text not null references public.vocabulary_items(id) on delete restrict,
  position integer not null check (position > 0),
  is_required boolean not null default true,
  learning_note text not null default '',
  settings jsonb not null default '{}'::jsonb,
  added_by uuid not null references auth.users(id),
  added_at timestamptz not null default now(),
  primary key (lesson_id, vocabulary_id),
  unique (lesson_id, position)
);

create index lesson_vocabulary_vocabulary_idx
on public.lesson_vocabulary (vocabulary_id, lesson_id);

alter table public.vocabulary_items enable row level security;
alter table public.vocabulary_meanings enable row level security;
alter table public.vocabulary_accepted_answers enable row level security;
alter table public.vocabulary_examples enable row level security;
alter table public.lesson_vocabulary enable row level security;

create policy "Published vocabulary is readable"
on public.vocabulary_items for select
using (
  status = 'published'
  or public.has_app_role(array['content_editor','admin']::public.app_role[])
);

create policy "Editors create vocabulary drafts"
on public.vocabulary_items for insert
with check (
  status = 'draft'
  and created_by = (select auth.uid())
  and public.has_app_role(array['content_editor','admin']::public.app_role[])
);

create policy "Editors update own vocabulary drafts"
on public.vocabulary_items for update
using (
  status in ('draft', 'changes_requested')
  and (
    created_by = (select auth.uid())
    or public.has_app_role(array['admin']::public.app_role[])
  )
)
with check (
  status in ('draft', 'changes_requested', 'in_review')
  and (
    created_by = (select auth.uid())
    or public.has_app_role(array['admin']::public.app_role[])
  )
);

create policy "Vocabulary child data follows parent visibility"
on public.vocabulary_meanings for select
using (
  exists (
    select 1 from public.vocabulary_items item
    where item.id = vocabulary_meanings.vocabulary_id
  )
);

create policy "Editors manage vocabulary meanings"
on public.vocabulary_meanings for all
using (
  exists (
    select 1 from public.vocabulary_items item
    where item.id = vocabulary_meanings.vocabulary_id
      and (
        item.created_by = (select auth.uid())
        or public.has_app_role(array['admin']::public.app_role[])
      )
  )
)
with check (
  exists (
    select 1 from public.vocabulary_items item
    where item.id = vocabulary_meanings.vocabulary_id
      and item.status in ('draft', 'changes_requested')
      and (
        item.created_by = (select auth.uid())
        or public.has_app_role(array['admin']::public.app_role[])
      )
  )
);

create policy "Vocabulary answers follow parent visibility"
on public.vocabulary_accepted_answers for select
using (
  exists (
    select 1 from public.vocabulary_items item
    where item.id = vocabulary_accepted_answers.vocabulary_id
  )
);

create policy "Editors manage vocabulary answers"
on public.vocabulary_accepted_answers for all
using (
  exists (
    select 1 from public.vocabulary_items item
    where item.id = vocabulary_accepted_answers.vocabulary_id
      and (
        item.created_by = (select auth.uid())
        or public.has_app_role(array['admin']::public.app_role[])
      )
  )
)
with check (
  exists (
    select 1 from public.vocabulary_items item
    where item.id = vocabulary_accepted_answers.vocabulary_id
      and item.status in ('draft', 'changes_requested')
      and (
        item.created_by = (select auth.uid())
        or public.has_app_role(array['admin']::public.app_role[])
      )
  )
);

create policy "Vocabulary examples follow parent visibility"
on public.vocabulary_examples for select
using (
  exists (
    select 1 from public.vocabulary_items item
    where item.id = vocabulary_examples.vocabulary_id
  )
);

create policy "Editors manage vocabulary examples"
on public.vocabulary_examples for all
using (
  exists (
    select 1 from public.vocabulary_items item
    where item.id = vocabulary_examples.vocabulary_id
      and (
        item.created_by = (select auth.uid())
        or public.has_app_role(array['admin']::public.app_role[])
      )
  )
)
with check (
  exists (
    select 1 from public.vocabulary_items item
    where item.id = vocabulary_examples.vocabulary_id
      and item.status in ('draft', 'changes_requested')
      and (
        item.created_by = (select auth.uid())
        or public.has_app_role(array['admin']::public.app_role[])
      )
  )
);

create policy "Published lesson vocabulary is readable"
on public.lesson_vocabulary for select
using (
  exists (
    select 1 from public.published_catalog catalog
    where catalog.content_id = lesson_vocabulary.lesson_id
      and catalog.content_type = 'lesson'
  )
  or public.has_app_role(array['content_editor','admin']::public.app_role[])
);

create policy "Editors manage lesson vocabulary"
on public.lesson_vocabulary for all
using (
  public.has_app_role(array['content_editor','admin']::public.app_role[])
)
with check (
  public.has_app_role(array['content_editor','admin']::public.app_role[])
);

grant select on public.vocabulary_items, public.vocabulary_meanings,
  public.vocabulary_accepted_answers, public.vocabulary_examples,
  public.lesson_vocabulary
to anon, authenticated;

grant insert, update on public.vocabulary_items to authenticated;
grant insert, update, delete on public.vocabulary_meanings,
  public.vocabulary_accepted_answers, public.vocabulary_examples,
  public.lesson_vocabulary
to authenticated;

insert into public.vocabulary_items (
  id, hangul, normalized_hangul, romanization, primary_meaning_vi,
  part_of_speech, level, category, audio_url, image_url,
  status, created_by
)
select
  vocabulary->>'id',
  vocabulary->>'korean',
  trim(vocabulary->>'korean'),
  coalesce(vocabulary->>'romanization', ''),
  vocabulary->>'vietnamese',
  nullif(vocabulary->>'partOfSpeech', ''),
  coalesce(revision.payload->>'level', 'beginner'),
  coalesce(nullif(vocabulary->>'category', ''), 'general'),
  nullif(vocabulary->>'audioUrl', ''),
  nullif(vocabulary->>'imageUrl', ''),
  'published',
  revision.created_by
from public.published_catalog catalog
join public.content_revisions revision
  on revision.content_id = catalog.content_id
  and revision.version = catalog.version
cross join lateral jsonb_array_elements(
  coalesce(catalog.payload->'vocabulary', '[]'::jsonb)
) as vocabularies(vocabulary)
where catalog.content_type = 'lesson'
  and vocabulary ? 'id'
  and vocabulary ? 'korean'
  and vocabulary ? 'vietnamese'
on conflict do nothing;

insert into public.vocabulary_meanings (
  vocabulary_id, meaning_vi, is_primary, position
)
select id, primary_meaning_vi, true, 1
from public.vocabulary_items
on conflict (vocabulary_id, position) do nothing;

insert into public.vocabulary_accepted_answers (
  vocabulary_id, direction, answer, normalized_answer
)
select id, 'ko_vi', primary_meaning_vi, lower(trim(primary_meaning_vi))
from public.vocabulary_items
on conflict (vocabulary_id, direction, normalized_answer) do nothing;

insert into public.vocabulary_accepted_answers (
  vocabulary_id, direction, answer, normalized_answer
)
select id, 'vi_ko', hangul, trim(hangul)
from public.vocabulary_items
on conflict (vocabulary_id, direction, normalized_answer) do nothing;

insert into public.vocabulary_examples (
  id, vocabulary_id, korean, vietnamese, audio_url, position
)
select
  example->>'id',
  vocabulary->>'id',
  example->>'korean',
  example->>'vietnamese',
  nullif(example->>'audioUrl', ''),
  example_ordinality::integer
from public.published_catalog catalog
cross join lateral jsonb_array_elements(
  coalesce(catalog.payload->'vocabulary', '[]'::jsonb)
) as vocabularies(vocabulary)
cross join lateral jsonb_array_elements(
  coalesce(vocabulary->'examples', '[]'::jsonb)
) with ordinality as examples(example, example_ordinality)
where catalog.content_type = 'lesson'
  and example ? 'id'
on conflict (id) do nothing;

insert into public.lesson_vocabulary (
  lesson_id, vocabulary_id, position, added_by
)
select
  catalog.content_id,
  vocabulary->>'id',
  vocabulary_ordinality::integer,
  revision.created_by
from public.published_catalog catalog
join public.content_revisions revision
  on revision.content_id = catalog.content_id
  and revision.version = catalog.version
cross join lateral jsonb_array_elements(
  coalesce(catalog.payload->'vocabulary', '[]'::jsonb)
) with ordinality as vocabularies(vocabulary, vocabulary_ordinality)
join public.vocabulary_items item on item.id = vocabulary->>'id'
where catalog.content_type = 'lesson'
on conflict (lesson_id, vocabulary_id) do nothing;
