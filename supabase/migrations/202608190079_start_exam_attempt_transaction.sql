create or replace function public.start_exam_attempt(
  p_exam_id uuid,
  p_attempt_mode text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  target_exam public.exam_sets%rowtype;
  active_attempt public.exam_attempts%rowtype;
  snapshot jsonb;
  question_count integer;
  duration_minutes integer;
  expires_at_value timestamptz;
  attempt_id uuid;
begin
  if actor_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if p_attempt_mode not in ('listening', 'reading', 'full') then
    raise exception 'INVALID_ATTEMPT_MODE';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(actor_id::text || ':' || p_exam_id::text || ':' || p_attempt_mode, 0)
  );

  select * into target_exam
  from public.exam_sets
  where id = p_exam_id and status = 'published'
  for share;
  if target_exam.id is null then
    raise exception 'EXAM_NOT_READY';
  end if;

  update public.exam_attempts
  set status = 'expired', updated_at = now()
  where user_id = actor_id
    and exam_id = p_exam_id
    and attempt_mode = p_attempt_mode
    and status = 'in_progress'
    and expires_at <= now();

  select * into active_attempt
  from public.exam_attempts
  where user_id = actor_id
    and exam_id = p_exam_id
    and attempt_mode = p_attempt_mode
    and status = 'in_progress'
    and expires_at > now()
  order by started_at desc
  limit 1
  for update;

  if active_attempt.id is not null and active_attempt.exam_version = target_exam.version then
    return active_attempt.id;
  end if;
  if active_attempt.id is not null then
    update public.exam_attempts
    set status = 'expired', expires_at = now(), updated_at = now()
    where id = active_attempt.id;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', question.id,
    'position', question.position,
    'section', question.section,
    'audio_block_key', question.audio_block_key,
    'reading_type', question.reading_type,
    'passage_block_key', question.passage_block_key,
    'passage', question.passage,
    'answer_type', question.answer_type,
    'instruction', question.instruction,
    'prompt', question.prompt,
    'audio_url', question.audio_url,
    'audio_text', question.audio_text,
    'image_url', question.image_url,
    'play_limit', question.play_limit,
    'options', question.options,
    'option_images', question.option_images,
    'correct_option', question.correct_option,
    'explanation', question.explanation
  ) order by question.section, question.position), '[]'::jsonb)
  into snapshot
  from public.exam_questions as question
  where question.exam_id = p_exam_id
    and (p_attempt_mode = 'full' or question.section = p_attempt_mode);

  question_count := jsonb_array_length(snapshot);
  if question_count = 0 then
    raise exception 'SECTION_NOT_READY';
  end if;
  if not exists (select 1 from public.exam_questions where exam_id = p_exam_id and section = 'listening')
    or not exists (select 1 from public.exam_questions where exam_id = p_exam_id and section = 'reading') then
    raise exception 'EXAM_NOT_READY';
  end if;

  duration_minutes := case p_attempt_mode
    when 'listening' then target_exam.listening_duration_minutes
    when 'reading' then target_exam.reading_duration_minutes
    else target_exam.listening_duration_minutes + target_exam.reading_duration_minutes
  end;
  expires_at_value := now() + make_interval(mins => duration_minutes);

  insert into public.exam_attempts (
    exam_id, user_id, attempt_mode, expires_at,
    listening_expires_at, reading_expires_at, exam_version,
    current_section, total_questions, question_snapshot
  ) values (
    p_exam_id, actor_id, p_attempt_mode, expires_at_value,
    case when p_attempt_mode = 'reading' then null else expires_at_value end,
    case when p_attempt_mode = 'listening' then null else expires_at_value end,
    target_exam.version,
    case when p_attempt_mode = 'reading' then 'reading' else 'listening' end,
    question_count, snapshot
  ) returning id into attempt_id;

  return attempt_id;
end;
$$;

revoke all on function public.start_exam_attempt(uuid, text) from public, anon;
grant execute on function public.start_exam_attempt(uuid, text) to authenticated;
