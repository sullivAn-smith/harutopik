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
  personalized_snapshot jsonb;
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

  context_text := coalesce(
    nullif(question->>'prompt', ''),
    nullif(question->>'instruction', ''),
    target_highlight.selected_text
  );
  vocabulary_key := 'exam-highlight-' || target_highlight.id::text;

  if target_highlight.review_list_id is not null then
    select snapshot into personalized_snapshot
    from public.vocabulary_list_items
    where list_id = target_highlight.review_list_id
      and user_id = actor_id
      and vocabulary_id = vocabulary_key;
  end if;

  item_snapshot := coalesce(
    personalized_snapshot,
    jsonb_build_object(
      'id', vocabulary_key,
      'korean', target_highlight.selected_text,
      'vietnamese', 'Từ cần bổ sung nghĩa',
      'romanization', 'Chưa bổ sung',
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
    )
  );

  if target_highlight.review_list_id is not null
    and target_highlight.review_list_id <> target_list.id
  then
    delete from public.vocabulary_list_items
    where list_id = target_highlight.review_list_id
      and user_id = actor_id
      and vocabulary_id = vocabulary_key;
  end if;

  insert into public.vocabulary_list_items(
    list_id,
    user_id,
    vocabulary_id,
    lesson_id,
    snapshot
  ) values (
    target_list.id,
    actor_id,
    vocabulary_key,
    'exam:' || target_attempt.exam_id::text,
    item_snapshot
  )
  on conflict (list_id, vocabulary_id) do update
  set user_id = excluded.user_id,
      lesson_id = excluded.lesson_id;

  update public.exam_highlights
  set review_list_id = target_list.id,
      review_saved_at = now()
  where id = target_highlight.id;

  return jsonb_build_object(
    'saved', true,
    'listId', target_list.id,
    'listName', target_list.name
  );
end;
$$;

revoke all on function public.save_exam_highlight_to_review_list(uuid, uuid, uuid) from public;
grant execute on function public.save_exam_highlight_to_review_list(uuid, uuid, uuid) to authenticated;

create or replace function public.remove_exam_highlight_from_review_list(
  p_highlight_id uuid,
  p_list_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  target_highlight public.exam_highlights;
  vocabulary_key text := 'exam-highlight-' || p_highlight_id::text;
begin
  if actor_id is null then raise exception 'UNAUTHENTICATED'; end if;

  select * into target_highlight
  from public.exam_highlights
  where id = p_highlight_id and user_id = actor_id
  for update;

  -- A learner may delete the visual highlight after saving its vocabulary item.
  -- In that case the personal item remains useful and must still be removable.
  if target_highlight.id is null then
    delete from public.vocabulary_list_items
    where list_id = p_list_id
      and user_id = actor_id
      and vocabulary_id = vocabulary_key;
    return;
  end if;
  if target_highlight.review_list_id is distinct from p_list_id then
    raise exception 'HIGHLIGHT_LIST_MISMATCH';
  end if;

  delete from public.vocabulary_list_items
  where list_id = p_list_id
    and user_id = actor_id
    and vocabulary_id = vocabulary_key;

  update public.exam_highlights
  set review_list_id = null,
      review_saved_at = null
  where id = target_highlight.id;
end;
$$;

revoke all on function public.remove_exam_highlight_from_review_list(uuid, uuid) from public;
grant execute on function public.remove_exam_highlight_from_review_list(uuid, uuid) to authenticated;
