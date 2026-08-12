-- Keep vocabulary CSV imports resilient when a draft owned by another editor
-- is hidden from the preview query by RLS. The commit function runs with
-- elevated visibility, so it can classify that row as skipped instead of
-- letting the duplicate guard abort the entire import transaction.

create or replace function public.commit_vocabulary_import(p_import_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  batch public.content_imports%rowtype;
  source_row public.content_import_rows%rowtype;
  vocabulary_id text;
  existing_vocabulary_id text;
  example_record record;
  imported_count integer := 0;
  skipped_count integer := 0;
begin
  select * into batch
  from public.content_imports
  where id = p_import_id
  for update;

  if not found then raise exception 'import_not_found'; end if;
  if batch.created_by <> (select auth.uid())
    and not public.has_app_role(array['admin']::public.app_role[]) then
    raise exception 'not_import_owner';
  end if;
  if batch.status not in ('ready', 'needs_attention') then
    raise exception 'import_not_ready';
  end if;

  update public.content_imports
  set status = 'importing'
  where id = p_import_id;

  -- Rows already recognized by the preview remain harmless and are skipped.
  update public.content_import_rows
  set row_status = 'skipped'
  where import_id = p_import_id
    and row_status = 'duplicate';

  for source_row in
    select *
    from public.content_import_rows
    where import_id = p_import_id
      and row_status = 'valid'
    order by row_number
    for update
  loop
    existing_vocabulary_id := null;

    -- This check intentionally runs inside the SECURITY DEFINER function. It
    -- therefore sees drafts that the editor preview cannot see through RLS.
    select existing.id
    into existing_vocabulary_id
    from public.vocabulary_items existing
    where existing.normalized_hangul =
        source_row.normalized_data->>'normalized_hangul'
      and coalesce(existing.part_of_speech, '') = coalesce(
        nullif(source_row.normalized_data->>'part_of_speech', ''),
        ''
      )
      and lower(existing.primary_meaning_vi) = lower(
        source_row.normalized_data->>'meaning_vi'
      )
    order by existing.created_at, existing.id
    limit 1;

    if existing_vocabulary_id is not null then
      update public.content_import_rows
      set
        row_status = 'skipped',
        duplicate_of = format(
          'Từ “%s” đã tồn tại trong thư viện và được tự động bỏ qua.',
          source_row.normalized_data->>'hangul'
        ),
        imported_vocabulary_id = existing_vocabulary_id
      where id = source_row.id;
      continue;
    end if;

    vocabulary_id := 'vocabulary-' || gen_random_uuid()::text;

    begin
      insert into public.vocabulary_items (
        id, hangul, normalized_hangul, romanization, primary_meaning_vi,
        part_of_speech, level, category, audio_url, image_url,
        status, created_by
      ) values (
        vocabulary_id,
        source_row.normalized_data->>'hangul',
        source_row.normalized_data->>'normalized_hangul',
        coalesce(source_row.normalized_data->>'romanization', ''),
        source_row.normalized_data->>'meaning_vi',
        nullif(source_row.normalized_data->>'part_of_speech', ''),
        coalesce(nullif(source_row.normalized_data->>'level', ''), 'beginner'),
        coalesce(nullif(source_row.normalized_data->>'category', ''), 'general'),
        nullif(source_row.normalized_data->>'audio_url', ''),
        nullif(source_row.normalized_data->>'image_url', ''),
        'draft',
        batch.created_by
      );
    exception
      when unique_violation then
        -- Close the small race between the pre-check and the insert. Only
        -- swallow a natural-key conflict; unrelated unique errors still fail.
        existing_vocabulary_id := null;
        select existing.id
        into existing_vocabulary_id
        from public.vocabulary_items existing
        where existing.normalized_hangul =
            source_row.normalized_data->>'normalized_hangul'
          and coalesce(existing.part_of_speech, '') = coalesce(
            nullif(source_row.normalized_data->>'part_of_speech', ''),
            ''
          )
          and lower(existing.primary_meaning_vi) = lower(
            source_row.normalized_data->>'meaning_vi'
          )
        order by existing.created_at, existing.id
        limit 1;

        if existing_vocabulary_id is null then
          raise;
        end if;

        update public.content_import_rows
        set
          row_status = 'skipped',
          duplicate_of = format(
            'Từ “%s” vừa được tạo ở phiên khác và được tự động bỏ qua.',
            source_row.normalized_data->>'hangul'
          ),
          imported_vocabulary_id = existing_vocabulary_id
        where id = source_row.id;
        continue;
    end;

    insert into public.vocabulary_meanings (
      vocabulary_id, meaning_vi, is_primary, position
    ) values (
      vocabulary_id,
      source_row.normalized_data->>'meaning_vi',
      true,
      1
    );

    insert into public.vocabulary_accepted_answers (
      vocabulary_id, direction, answer, normalized_answer
    )
    select vocabulary_id, 'ko_vi', answer.value, lower(trim(answer.value))
    from jsonb_array_elements_text(
      coalesce(source_row.normalized_data->'accepted_vi', '[]'::jsonb)
    ) as answer(value)
    where char_length(trim(answer.value)) > 0
    on conflict do nothing;

    insert into public.vocabulary_accepted_answers (
      vocabulary_id, direction, answer, normalized_answer
    )
    select vocabulary_id, 'vi_ko', answer.value, trim(answer.value)
    from jsonb_array_elements_text(
      coalesce(source_row.normalized_data->'accepted_ko', '[]'::jsonb)
    ) as answer(value)
    where char_length(trim(answer.value)) > 0
    on conflict do nothing;

    for example_record in
      select example.value, example.ordinality
      from jsonb_array_elements(
        coalesce(source_row.normalized_data->'examples', '[]'::jsonb)
      ) with ordinality as example(value, ordinality)
    loop
      insert into public.vocabulary_examples (
        id, vocabulary_id, korean, vietnamese, position
      ) values (
        vocabulary_id || '-example-' ||
          lpad(example_record.ordinality::text, 3, '0'),
        vocabulary_id,
        example_record.value->>'korean',
        example_record.value->>'vietnamese',
        example_record.ordinality
      );
    end loop;

    update public.content_import_rows
    set
      row_status = 'imported',
      imported_vocabulary_id = vocabulary_id
    where id = source_row.id;

    imported_count := imported_count + 1;
  end loop;

  select count(*)::integer
  into skipped_count
  from public.content_import_rows
  where import_id = p_import_id
    and row_status = 'skipped';

  update public.content_imports
  set
    status = 'completed',
    valid_rows = imported_count,
    duplicate_rows = skipped_count,
    completed_at = now()
  where id = p_import_id;

  insert into public.audit_logs (
    actor_id, action, entity_type, entity_id, metadata
  ) values (
    (select auth.uid()),
    'vocabulary.import.completed',
    'content_import',
    p_import_id::text,
    jsonb_build_object(
      'file_name', batch.file_name,
      'imported_count', imported_count,
      'duplicate_count', skipped_count,
      'invalid_count', batch.invalid_rows
    )
  );

  return imported_count;
end;
$$;

revoke all on function public.commit_vocabulary_import(uuid) from public;
grant execute on function public.commit_vocabulary_import(uuid)
to authenticated;
