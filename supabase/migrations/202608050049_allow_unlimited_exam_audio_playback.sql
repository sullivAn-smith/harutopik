-- Learners may replay and seek every listening audio without a play limit.
-- The counter remains available as lightweight analytics and for compatibility
-- with clients that still call the playback endpoint.

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

  update public.exam_attempts
  set audio_plays = jsonb_set(audio_plays, array[play_key], to_jsonb(used + 1), true),
      updated_at = now()
  where id = p_attempt_id;

  return used + 1;
end
$$;

grant execute on function public.consume_exam_audio_play(uuid, uuid) to authenticated;
