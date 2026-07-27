create table public.content_imports (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  file_type text not null check (file_type in ('csv', 'xlsx')),
  status text not null default 'uploaded' check (
    status in ('uploaded', 'validating', 'needs_attention', 'ready', 'importing', 'completed', 'failed')
  ),
  total_rows integer not null default 0 check (total_rows >= 0),
  valid_rows integer not null default 0 check (valid_rows >= 0),
  invalid_rows integer not null default 0 check (invalid_rows >= 0),
  duplicate_rows integer not null default 0 check (duplicate_rows >= 0),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.content_import_rows (
  id bigint generated always as identity primary key,
  import_id uuid not null references public.content_imports(id) on delete cascade,
  row_number integer not null check (row_number > 1),
  raw_data jsonb not null,
  normalized_data jsonb not null default '{}'::jsonb,
  validation_errors text[] not null default '{}',
  duplicate_of text,
  row_status text not null check (row_status in ('valid', 'invalid', 'duplicate', 'imported', 'skipped')),
  imported_vocabulary_id text references public.vocabulary_items(id),
  unique (import_id, row_number)
);

create index content_imports_owner_idx
on public.content_imports (created_by, created_at desc);

create index content_import_rows_batch_idx
on public.content_import_rows (import_id, row_status, row_number);

alter table public.content_imports enable row level security;
alter table public.content_import_rows enable row level security;

create policy "Editors manage own imports"
on public.content_imports for all
to authenticated
using (
  created_by = (select auth.uid())
  or public.has_app_role(array['admin']::public.app_role[])
)
with check (
  created_by = (select auth.uid())
  or public.has_app_role(array['admin']::public.app_role[])
);

create policy "Editors manage rows in own imports"
on public.content_import_rows for all
to authenticated
using (
  exists (
    select 1 from public.content_imports batch
    where batch.id = content_import_rows.import_id
      and (
        batch.created_by = (select auth.uid())
        or public.has_app_role(array['admin']::public.app_role[])
      )
  )
)
with check (
  exists (
    select 1 from public.content_imports batch
    where batch.id = content_import_rows.import_id
      and (
        batch.created_by = (select auth.uid())
        or public.has_app_role(array['admin']::public.app_role[])
      )
  )
);

grant select, insert, update, delete
on public.content_imports, public.content_import_rows
to authenticated;

grant usage, select on sequence public.content_import_rows_id_seq
to authenticated;

grant all privileges
on public.content_imports, public.content_import_rows
to service_role;

create function public.commit_vocabulary_import(p_import_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  batch public.content_imports%rowtype;
  source_row public.content_import_rows%rowtype;
  vocabulary_id text;
  example_record record;
  imported_count integer := 0;
begin
  select * into batch from public.content_imports
  where id = p_import_id for update;
  if not found then raise exception 'import_not_found'; end if;
  if batch.created_by <> (select auth.uid())
    and not public.has_app_role(array['admin']::public.app_role[]) then
    raise exception 'not_import_owner';
  end if;
  if batch.status not in ('ready', 'needs_attention') then
    raise exception 'import_not_ready';
  end if;

  update public.content_imports set status = 'importing'
  where id = p_import_id;

  for source_row in
    select * from public.content_import_rows
    where import_id = p_import_id and row_status = 'valid'
    order by row_number
    for update
  loop
    vocabulary_id := 'vocabulary-' || gen_random_uuid()::text;

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

    insert into public.vocabulary_meanings (
      vocabulary_id, meaning_vi, is_primary, position
    ) values (
      vocabulary_id, source_row.normalized_data->>'meaning_vi', true, 1
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
        vocabulary_id || '-example-' || lpad(example_record.ordinality::text, 3, '0'),
        vocabulary_id,
        example_record.value->>'korean',
        example_record.value->>'vietnamese',
        example_record.ordinality
      );
    end loop;

    update public.content_import_rows set
      row_status = 'imported',
      imported_vocabulary_id = vocabulary_id
    where id = source_row.id;
    imported_count := imported_count + 1;
  end loop;

  update public.content_import_rows set row_status = 'skipped'
  where import_id = p_import_id and row_status = 'duplicate';

  update public.content_imports set
    status = 'completed',
    completed_at = now()
  where id = p_import_id;

  insert into public.audit_logs (
    actor_id, action, entity_type, entity_id, metadata
  ) values (
    (select auth.uid()), 'vocabulary.import.completed', 'content_import',
    p_import_id::text,
    jsonb_build_object(
      'file_name', batch.file_name,
      'imported_count', imported_count,
      'duplicate_count', batch.duplicate_rows,
      'invalid_count', batch.invalid_rows
    )
  );
  return imported_count;
end;
$$;

revoke all on function public.commit_vocabulary_import(uuid) from public;
grant execute on function public.commit_vocabulary_import(uuid)
to authenticated;
