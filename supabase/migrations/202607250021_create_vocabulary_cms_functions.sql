drop policy if exists "Content staff reads all vocabulary"
on public.vocabulary_items;

create policy "Content staff reads permitted vocabulary"
on public.vocabulary_items for select
to authenticated
using (
  status = 'published'
  or created_by = (select auth.uid())
  or public.has_app_role(array['admin']::public.app_role[])
);

create function public.create_vocabulary_draft(
  p_hangul text,
  p_romanization text,
  p_primary_meaning_vi text,
  p_part_of_speech text,
  p_level text,
  p_category text,
  p_audio_url text,
  p_image_url text,
  p_accepted_vi text[],
  p_accepted_ko text[],
  p_examples jsonb
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  vocabulary_id text := 'vocabulary-' || gen_random_uuid()::text;
  example_record record;
begin
  if not public.has_app_role(array['content_editor','admin']::public.app_role[]) then
    raise exception 'insufficient_privilege';
  end if;
  if char_length(trim(p_hangul)) = 0
    or char_length(trim(p_primary_meaning_vi)) = 0 then
    raise exception 'invalid_vocabulary';
  end if;

  insert into public.vocabulary_items (
    id, hangul, normalized_hangul, romanization, primary_meaning_vi,
    part_of_speech, level, category, audio_url, image_url,
    status, created_by
  ) values (
    vocabulary_id, trim(p_hangul), trim(p_hangul), trim(p_romanization),
    trim(p_primary_meaning_vi), nullif(trim(p_part_of_speech), ''),
    coalesce(nullif(trim(p_level), ''), 'beginner'),
    coalesce(nullif(trim(p_category), ''), 'general'),
    nullif(trim(p_audio_url), ''), nullif(trim(p_image_url), ''),
    'draft', (select auth.uid())
  );

  insert into public.vocabulary_meanings (
    vocabulary_id, meaning_vi, is_primary, position
  ) values (vocabulary_id, trim(p_primary_meaning_vi), true, 1);

  insert into public.vocabulary_accepted_answers (
    vocabulary_id, direction, answer, normalized_answer
  )
  select vocabulary_id, 'ko_vi', answer, lower(trim(answer))
  from unnest(array_append(coalesce(p_accepted_vi, '{}'), p_primary_meaning_vi)) answer
  where char_length(trim(answer)) > 0
  on conflict do nothing;

  insert into public.vocabulary_accepted_answers (
    vocabulary_id, direction, answer, normalized_answer
  )
  select vocabulary_id, 'vi_ko', answer, trim(answer)
  from unnest(array_append(coalesce(p_accepted_ko, '{}'), p_hangul)) answer
  where char_length(trim(answer)) > 0
  on conflict do nothing;

  for example_record in
    select value, ordinality
    from jsonb_array_elements(coalesce(p_examples, '[]'::jsonb))
      with ordinality
  loop
    if char_length(trim(example_record.value->>'korean')) > 0
      and char_length(trim(example_record.value->>'vietnamese')) > 0 then
      insert into public.vocabulary_examples (
        id, vocabulary_id, korean, vietnamese, position
      ) values (
        vocabulary_id || '-example-' || lpad(example_record.ordinality::text, 3, '0'),
        vocabulary_id,
        trim(example_record.value->>'korean'),
        trim(example_record.value->>'vietnamese'),
        example_record.ordinality
      );
    end if;
  end loop;

  insert into public.audit_logs (
    actor_id, action, entity_type, entity_id, metadata
  ) values (
    (select auth.uid()), 'vocabulary.draft.created', 'vocabulary',
    vocabulary_id, jsonb_build_object('hangul', trim(p_hangul))
  );
  return vocabulary_id;
end;
$$;

create function public.update_vocabulary_draft(
  p_vocabulary_id text,
  p_hangul text,
  p_romanization text,
  p_primary_meaning_vi text,
  p_part_of_speech text,
  p_level text,
  p_category text,
  p_audio_url text,
  p_image_url text,
  p_accepted_vi text[],
  p_accepted_ko text[],
  p_examples jsonb
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  item public.vocabulary_items%rowtype;
  example_record record;
begin
  select * into item from public.vocabulary_items
  where id = p_vocabulary_id for update;
  if not found then raise exception 'vocabulary_not_found'; end if;
  if item.status not in ('draft', 'changes_requested') then
    raise exception 'vocabulary_not_editable';
  end if;
  if item.created_by <> (select auth.uid())
    and not public.has_app_role(array['admin']::public.app_role[]) then
    raise exception 'not_vocabulary_owner';
  end if;

  update public.vocabulary_items set
    hangul = trim(p_hangul),
    normalized_hangul = trim(p_hangul),
    romanization = trim(p_romanization),
    primary_meaning_vi = trim(p_primary_meaning_vi),
    part_of_speech = nullif(trim(p_part_of_speech), ''),
    level = coalesce(nullif(trim(p_level), ''), 'beginner'),
    category = coalesce(nullif(trim(p_category), ''), 'general'),
    audio_url = nullif(trim(p_audio_url), ''),
    image_url = nullif(trim(p_image_url), ''),
    status = 'draft',
    updated_at = now()
  where id = p_vocabulary_id;

  delete from public.vocabulary_meanings where vocabulary_id = p_vocabulary_id;
  delete from public.vocabulary_accepted_answers where vocabulary_id = p_vocabulary_id;
  delete from public.vocabulary_examples where vocabulary_id = p_vocabulary_id;

  insert into public.vocabulary_meanings (
    vocabulary_id, meaning_vi, is_primary, position
  ) values (p_vocabulary_id, trim(p_primary_meaning_vi), true, 1);

  insert into public.vocabulary_accepted_answers (
    vocabulary_id, direction, answer, normalized_answer
  )
  select p_vocabulary_id, 'ko_vi', answer, lower(trim(answer))
  from unnest(array_append(coalesce(p_accepted_vi, '{}'), p_primary_meaning_vi)) answer
  where char_length(trim(answer)) > 0
  on conflict do nothing;

  insert into public.vocabulary_accepted_answers (
    vocabulary_id, direction, answer, normalized_answer
  )
  select p_vocabulary_id, 'vi_ko', answer, trim(answer)
  from unnest(array_append(coalesce(p_accepted_ko, '{}'), p_hangul)) answer
  where char_length(trim(answer)) > 0
  on conflict do nothing;

  for example_record in
    select value, ordinality
    from jsonb_array_elements(coalesce(p_examples, '[]'::jsonb))
      with ordinality
  loop
    if char_length(trim(example_record.value->>'korean')) > 0
      and char_length(trim(example_record.value->>'vietnamese')) > 0 then
      insert into public.vocabulary_examples (
        id, vocabulary_id, korean, vietnamese, position
      ) values (
        p_vocabulary_id || '-example-' || lpad(example_record.ordinality::text, 3, '0'),
        p_vocabulary_id,
        trim(example_record.value->>'korean'),
        trim(example_record.value->>'vietnamese'),
        example_record.ordinality
      );
    end if;
  end loop;

  insert into public.audit_logs (
    actor_id, action, entity_type, entity_id, metadata
  ) values (
    (select auth.uid()), 'vocabulary.draft.updated', 'vocabulary',
    p_vocabulary_id, '{}'::jsonb
  );
  return p_vocabulary_id;
end;
$$;

create function public.set_lesson_revision_vocabulary(
  p_revision_id uuid,
  p_vocabulary_ids text[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  revision public.content_revisions%rowtype;
  vocabulary_payload jsonb;
begin
  select * into revision from public.content_revisions
  where id = p_revision_id for update;
  if not found then raise exception 'revision_not_found'; end if;
  if revision.content_type <> 'lesson'
    or revision.status not in ('draft', 'changes_requested') then
    raise exception 'revision_not_editable';
  end if;
  if revision.created_by <> (select auth.uid())
    and not public.has_app_role(array['admin']::public.app_role[]) then
    raise exception 'not_revision_owner';
  end if;

  if exists (
    select 1
    from unnest(coalesce(p_vocabulary_ids, '{}')) requested(id)
    left join public.vocabulary_items item on item.id = requested.id
    where item.id is null
      or (
        item.status <> 'published'
        and item.created_by <> (select auth.uid())
        and not public.has_app_role(array['admin']::public.app_role[])
      )
  ) then raise exception 'invalid_vocabulary_selection'; end if;

  select coalesce(jsonb_agg(
    jsonb_strip_nulls(jsonb_build_object(
      'id', item.id,
      'korean', item.hangul,
      'vietnamese', item.primary_meaning_vi,
      'romanization', item.romanization,
      'category', item.category,
      'partOfSpeech', item.part_of_speech,
      'audioUrl', item.audio_url,
      'imageUrl', item.image_url,
      'acceptedVietnameseAnswers', coalesce(answers.vi, '[]'::jsonb),
      'acceptedKoreanAnswers', coalesce(answers.ko, '[]'::jsonb),
      'examples', coalesce(examples.items, '[]'::jsonb)
    )) order by requested.ordinality
  ), '[]'::jsonb)
  into vocabulary_payload
  from unnest(coalesce(p_vocabulary_ids, '{}')) with ordinality requested(id, ordinality)
  join public.vocabulary_items item on item.id = requested.id
  left join lateral (
    select
      jsonb_agg(answer order by answer) filter (where direction = 'ko_vi') as vi,
      jsonb_agg(answer order by answer) filter (where direction = 'vi_ko') as ko
    from public.vocabulary_accepted_answers
    where vocabulary_id = item.id
  ) answers on true
  left join lateral (
    select jsonb_agg(
      jsonb_build_object('id', id, 'korean', korean, 'vietnamese', vietnamese)
      order by position
    ) as items
    from public.vocabulary_examples
    where vocabulary_id = item.id
  ) examples on true;

  update public.content_revisions set
    payload = jsonb_set(payload, '{vocabulary}', vocabulary_payload, true),
    status = 'draft',
    updated_at = now()
  where id = p_revision_id;

  insert into public.audit_logs (
    actor_id, action, entity_type, entity_id, metadata
  ) values (
    (select auth.uid()), 'lesson.vocabulary.updated', 'lesson',
    revision.content_id,
    jsonb_build_object(
      'revision_id', revision.id,
      'vocabulary_count', cardinality(coalesce(p_vocabulary_ids, '{}'))
    )
  );
  return p_revision_id;
end;
$$;

revoke all on function public.create_vocabulary_draft(
  text,text,text,text,text,text,text,text,text[],text[],jsonb
) from public;
grant execute on function public.create_vocabulary_draft(
  text,text,text,text,text,text,text,text,text[],text[],jsonb
) to authenticated;

revoke all on function public.update_vocabulary_draft(
  text,text,text,text,text,text,text,text,text,text[],text[],jsonb
) from public;
grant execute on function public.update_vocabulary_draft(
  text,text,text,text,text,text,text,text,text,text[],text[],jsonb
) to authenticated;

revoke all on function public.set_lesson_revision_vocabulary(uuid,text[])
from public;
grant execute on function public.set_lesson_revision_vocabulary(uuid,text[])
to authenticated;
