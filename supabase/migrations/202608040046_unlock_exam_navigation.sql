-- Learners may move freely between Listening and Reading while the overall
-- attempt timer is still running. Audio remains single-play per audio block.

create or replace function public.consume_exam_audio_play(
  p_attempt_id uuid,
  p_question_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.exam_attempts;
  question jsonb;
  play_key text;
  used integer;
begin
  select * into target
  from public.exam_attempts
  where id = p_attempt_id
  for update;

  if target.id is null or target.user_id <> auth.uid() then
    raise exception 'ATTEMPT_NOT_FOUND';
  end if;
  if target.status <> 'in_progress' then
    raise exception 'ATTEMPT_FINISHED';
  end if;
  if target.expires_at is null or target.expires_at <= now() then
    raise exception 'EXAM_EXPIRED';
  end if;

  select value into question
  from jsonb_array_elements(target.question_snapshot)
  where value->>'id' = p_question_id::text
    and value->>'section' = 'listening';

  if question is null then
    raise exception 'QUESTION_NOT_FOUND';
  end if;

  play_key := coalesce(nullif(question->>'audio_block_key', ''), p_question_id::text);
  used := coalesce((target.audio_plays->>play_key)::integer, 0);
  if used >= 1 then
    raise exception 'PLAY_LIMIT_REACHED';
  end if;

  update public.exam_attempts
  set audio_plays = jsonb_set(audio_plays, array[play_key], to_jsonb(used + 1), true),
      updated_at = now()
  where id = p_attempt_id;

  return used + 1;
end
$$;

create or replace function public.record_exam_window_event(
  p_attempt_id uuid,
  p_section text,
  p_event_type text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.exam_attempts;
begin
  select * into target
  from public.exam_attempts
  where id = p_attempt_id
  for update;

  if target.id is null or target.user_id <> auth.uid() then
    raise exception 'ATTEMPT_NOT_FOUND';
  end if;
  if target.status <> 'in_progress' then
    raise exception 'ATTEMPT_FINISHED';
  end if;
  if target.expires_at is null or target.expires_at <= now() then
    raise exception 'EXAM_EXPIRED';
  end if;
  if p_section not in ('listening', 'reading') then
    raise exception 'INVALID_SECTION';
  end if;
  if p_event_type not in ('hidden', 'blur', 'fullscreen_exit') then
    raise exception 'INVALID_EVENT';
  end if;

  if exists (
    select 1
    from public.exam_window_events
    where attempt_id = p_attempt_id
      and occurred_at > now() - interval '2 seconds'
  ) then
    return target.window_leave_count;
  end if;

  insert into public.exam_window_events(attempt_id, user_id, section, event_type)
  values (p_attempt_id, auth.uid(), p_section, p_event_type);

  update public.exam_attempts
  set window_leave_count = window_leave_count + 1,
      updated_at = now()
  where id = p_attempt_id
  returning window_leave_count into target.window_leave_count;

  return target.window_leave_count;
end
$$;

grant execute on function public.consume_exam_audio_play(uuid, uuid) to authenticated;
grant execute on function public.record_exam_window_event(uuid, text, text) to authenticated;
