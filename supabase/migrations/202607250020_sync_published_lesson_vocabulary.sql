create function public.sync_published_lesson_vocabulary()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid;
begin
  if new.content_type <> 'lesson' then return new; end if;

  select created_by into owner_id
  from public.content_revisions
  where content_id = new.content_id and version = new.version;

  if owner_id is null then raise exception 'published_revision_owner_not_found'; end if;

  insert into public.vocabulary_items (
    id, hangul, normalized_hangul, romanization, primary_meaning_vi,
    part_of_speech, level, category, audio_url, image_url,
    status, created_by, updated_at
  )
  select
    vocabulary->>'id',
    vocabulary->>'korean',
    trim(vocabulary->>'korean'),
    coalesce(vocabulary->>'romanization', ''),
    vocabulary->>'vietnamese',
    nullif(vocabulary->>'partOfSpeech', ''),
    coalesce(new.payload->>'level', 'beginner'),
    coalesce(nullif(vocabulary->>'category', ''), 'general'),
    nullif(vocabulary->>'audioUrl', ''),
    nullif(vocabulary->>'imageUrl', ''),
    'published',
    owner_id,
    now()
  from jsonb_array_elements(
    coalesce(new.payload->'vocabulary', '[]'::jsonb)
  ) as vocabularies(vocabulary)
  where vocabulary ? 'id'
    and vocabulary ? 'korean'
    and vocabulary ? 'vietnamese'
  on conflict (id) do update set
    hangul = excluded.hangul,
    normalized_hangul = excluded.normalized_hangul,
    romanization = excluded.romanization,
    primary_meaning_vi = excluded.primary_meaning_vi,
    part_of_speech = excluded.part_of_speech,
    level = excluded.level,
    category = excluded.category,
    audio_url = excluded.audio_url,
    image_url = excluded.image_url,
    status = 'published',
    updated_at = now();

  insert into public.vocabulary_meanings (
    vocabulary_id, meaning_vi, is_primary, position
  )
  select
    vocabulary->>'id', vocabulary->>'vietnamese', true, 1
  from jsonb_array_elements(
    coalesce(new.payload->'vocabulary', '[]'::jsonb)
  ) as vocabularies(vocabulary)
  join public.vocabulary_items item on item.id = vocabulary->>'id'
  on conflict (vocabulary_id, position) do update set
    meaning_vi = excluded.meaning_vi,
    is_primary = true;

  insert into public.vocabulary_accepted_answers (
    vocabulary_id, direction, answer, normalized_answer
  )
  select
    vocabulary->>'id', 'ko_vi', vocabulary->>'vietnamese',
    lower(trim(vocabulary->>'vietnamese'))
  from jsonb_array_elements(
    coalesce(new.payload->'vocabulary', '[]'::jsonb)
  ) as vocabularies(vocabulary)
  join public.vocabulary_items item on item.id = vocabulary->>'id'
  on conflict (vocabulary_id, direction, normalized_answer) do update set
    answer = excluded.answer;

  insert into public.vocabulary_accepted_answers (
    vocabulary_id, direction, answer, normalized_answer
  )
  select
    vocabulary->>'id', 'vi_ko', vocabulary->>'korean',
    trim(vocabulary->>'korean')
  from jsonb_array_elements(
    coalesce(new.payload->'vocabulary', '[]'::jsonb)
  ) as vocabularies(vocabulary)
  join public.vocabulary_items item on item.id = vocabulary->>'id'
  on conflict (vocabulary_id, direction, normalized_answer) do update set
    answer = excluded.answer;

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
  from jsonb_array_elements(
    coalesce(new.payload->'vocabulary', '[]'::jsonb)
  ) as vocabularies(vocabulary)
  cross join lateral jsonb_array_elements(
    coalesce(vocabulary->'examples', '[]'::jsonb)
  ) with ordinality as examples(example, example_ordinality)
  join public.vocabulary_items item on item.id = vocabulary->>'id'
  where example ? 'id'
  on conflict (id) do update set
    korean = excluded.korean,
    vietnamese = excluded.vietnamese,
    audio_url = excluded.audio_url,
    position = excluded.position;

  delete from public.lesson_vocabulary
  where lesson_id = new.content_id;

  insert into public.lesson_vocabulary (
    lesson_id, vocabulary_id, position, added_by
  )
  select
    new.content_id,
    vocabulary->>'id',
    vocabulary_ordinality::integer,
    owner_id
  from jsonb_array_elements(
    coalesce(new.payload->'vocabulary', '[]'::jsonb)
  ) with ordinality as vocabularies(vocabulary, vocabulary_ordinality)
  join public.vocabulary_items item on item.id = vocabulary->>'id';

  return new;
end;
$$;

create trigger sync_published_lesson_vocabulary
after insert or update of payload, version on public.published_catalog
for each row execute function public.sync_published_lesson_vocabulary();
