create or replace function public.upsert_exam_highlight(
  p_attempt_id uuid,
  p_question_id uuid,
  p_section text,
  p_source_field text,
  p_source_index smallint,
  p_selected_text text,
  p_prefix_text text,
  p_suffix_text text,
  p_color text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  target_attempt public.exam_attempts;
  target_highlight public.exam_highlights;
begin
  if actor_id is null then raise exception 'UNAUTHENTICATED'; end if;
  if p_section not in ('listening', 'reading')
    or p_source_field not in ('instruction', 'prompt', 'option')
    or p_color not in ('yellow', 'blue', 'pink')
    or char_length(trim(coalesce(p_selected_text, ''))) not between 1 and 120
    or char_length(coalesce(p_prefix_text, '')) > 40
    or char_length(coalesce(p_suffix_text, '')) > 40
    or (p_source_field = 'option' and (p_source_index is null or p_source_index not between 0 and 3))
    or (p_source_field <> 'option' and p_source_index is not null)
  then
    raise exception 'INVALID_HIGHLIGHT';
  end if;

  select * into target_attempt
  from public.exam_attempts
  where id = p_attempt_id and user_id = actor_id
  for update;
  if target_attempt.id is null then raise exception 'ATTEMPT_NOT_FOUND'; end if;
  if target_attempt.status <> 'in_progress' then raise exception 'ATTEMPT_CLOSED'; end if;
  if not exists (
    select 1
    from jsonb_array_elements(coalesce(target_attempt.question_snapshot, '[]'::jsonb)) question
    where question->>'id' = p_question_id::text
      and question->>'section' = p_section
  ) then
    raise exception 'QUESTION_NOT_FOUND';
  end if;

  select * into target_highlight
  from public.exam_highlights
  where attempt_id = p_attempt_id
    and user_id = actor_id
    and question_id = p_question_id
    and source_field = p_source_field
    and source_index is not distinct from p_source_index
    and selected_text = trim(p_selected_text)
    and prefix_text = coalesce(p_prefix_text, '')
    and suffix_text = coalesce(p_suffix_text, '')
  limit 1;

  if target_highlight.id is not null then
    update public.exam_highlights
    set color = p_color
    where id = target_highlight.id
    returning * into target_highlight;
    return to_jsonb(target_highlight);
  end if;

  if (select count(*) from public.exam_highlights where attempt_id = p_attempt_id and user_id = actor_id) >= 50 then
    raise exception 'HIGHLIGHT_LIMIT';
  end if;

  insert into public.exam_highlights(
    attempt_id, user_id, question_id, section, source_field, source_index,
    selected_text, prefix_text, suffix_text, color
  ) values (
    p_attempt_id, actor_id, p_question_id, p_section, p_source_field, p_source_index,
    trim(p_selected_text), coalesce(p_prefix_text, ''), coalesce(p_suffix_text, ''), p_color
  ) returning * into target_highlight;

  return to_jsonb(target_highlight);
end;
$$;

create or replace function public.save_exam_highlight_to_review_list(
  p_attempt_id uuid,
  p_highlight_id uuid,
  p_list_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  target_attempt public.exam_attempts;
  target_highlight public.exam_highlights;
  target_list public.vocabulary_lists;
  question jsonb;
  context_text text;
  vocabulary_key text;
  item_snapshot jsonb;
begin
  if actor_id is null then raise exception 'UNAUTHENTICATED'; end if;

  select * into target_attempt
  from public.exam_attempts
  where id = p_attempt_id and user_id = actor_id;
  if target_attempt.id is null then raise exception 'ATTEMPT_NOT_FOUND'; end if;

  select * into target_highlight
  from public.exam_highlights
  where id = p_highlight_id and attempt_id = p_attempt_id and user_id = actor_id
  for update;
  if target_highlight.id is null then raise exception 'HIGHLIGHT_NOT_FOUND'; end if;

  select * into target_list
  from public.vocabulary_lists
  where id = p_list_id and user_id = actor_id;
  if target_list.id is null then raise exception 'LIST_NOT_FOUND'; end if;

  select value into question
  from jsonb_array_elements(coalesce(target_attempt.question_snapshot, '[]'::jsonb))
  where value->>'id' = target_highlight.question_id::text
  limit 1;
  context_text := coalesce(nullif(question->>'prompt', ''), nullif(question->>'instruction', ''), target_highlight.selected_text);
  vocabulary_key := 'exam-highlight-' || target_highlight.id::text;
  item_snapshot := jsonb_build_object(
    'id', vocabulary_key,
    'korean', target_highlight.selected_text,
    'vietnamese', 'Từ cần ôn từ đề thi',
    'romanization', '—',
    'category', 'Luyện đề',
    'partOfSpeech', 'Từ highlight',
    'examples', case
      when context_text <> target_highlight.selected_text then jsonb_build_array(jsonb_build_object(
        'id', vocabulary_key || '-context',
        'korean', context_text,
        'vietnamese', 'Ngữ cảnh trong đề thi'
      ))
      else '[]'::jsonb
    end
  );

  if target_highlight.review_list_id is not null and target_highlight.review_list_id <> target_list.id then
    delete from public.vocabulary_list_items
    where list_id = target_highlight.review_list_id
      and user_id = actor_id
      and vocabulary_id = vocabulary_key;
  end if;

  insert into public.vocabulary_list_items(list_id, user_id, vocabulary_id, lesson_id, snapshot)
  values (target_list.id, actor_id, vocabulary_key, 'exam:' || target_attempt.exam_id::text, item_snapshot)
  on conflict (list_id, vocabulary_id) do update
  set user_id = excluded.user_id,
      lesson_id = excluded.lesson_id,
      snapshot = excluded.snapshot;

  update public.exam_highlights
  set review_list_id = target_list.id, review_saved_at = now()
  where id = target_highlight.id;

  return jsonb_build_object('saved', true, 'listId', target_list.id, 'listName', target_list.name);
end;
$$;

revoke all on function public.upsert_exam_highlight(uuid, uuid, text, text, smallint, text, text, text, text) from public;
revoke all on function public.save_exam_highlight_to_review_list(uuid, uuid, uuid) from public;
grant execute on function public.upsert_exam_highlight(uuid, uuid, text, text, smallint, text, text, text, text) to authenticated;
grant execute on function public.save_exam_highlight_to_review_list(uuid, uuid, uuid) to authenticated;
grant all privileges on public.vocabulary_lists, public.vocabulary_list_items to service_role;
