alter table public.speed_test_attempts
  drop constraint if exists speed_test_attempts_game_type_check;

alter table public.speed_test_attempts
  add constraint speed_test_attempts_game_type_check
  check (game_type in ('typing_sprint', 'audio_reaction', 'flash_reaction')) not valid;

alter table public.speed_test_attempts
  validate constraint speed_test_attempts_game_type_check;

create index if not exists speed_test_reaction_record_idx
  on public.speed_test_attempts (
    user_id, source_id, game_type, answer_mode, requested_question_count,
    score desc, total_time_ms asc
  )
  where game_type in ('audio_reaction', 'flash_reaction');

create or replace function public.save_audio_reaction_result(
  p_attempt jsonb,
  p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  attempt_id uuid := (p_attempt->>'id')::uuid;
  answer jsonb;
  progress public.user_word_progress;
  attempts_count integer;
  mastery numeric;
  mastery_state public.word_mastery_status;
  reaction_game text := coalesce(p_attempt->>'gameType', 'audio_reaction');
  reaction_direction public.speed_test_direction := coalesce(p_attempt->>'direction', 'ko_vi')::public.speed_test_direction;
begin
  if actor_id is null then raise exception 'UNAUTHENTICATED'; end if;
  if jsonb_typeof(p_answers) <> 'array' then raise exception 'INVALID_ANSWERS'; end if;
  if reaction_game not in ('audio_reaction', 'flash_reaction') then raise exception 'INVALID_GAME_TYPE'; end if;
  if exists (select 1 from public.speed_test_attempts where id = attempt_id) then
    raise exception 'ATTEMPT_EXISTS';
  end if;

  insert into public.speed_test_attempts (
    id,user_id,list_id,list_name,source_kind,source_id,direction,requested_question_count,
    total_questions,answered_count,correct_count,wrong_count,near_miss_count,accuracy,
    starting_seconds,remaining_seconds,best_combo,rating,finish_reason,rules_version,
    question_ids,started_at,finished_at,is_daily,challenge_date,game_type,answer_mode,
    score,total_time_ms,lives_remaining,perfect_count,great_count,good_count,miss_count,
    game_over,scoring_version
  ) values (
    attempt_id,actor_id,null,p_attempt->>'lessonName','lesson',p_attempt->>'lessonId',reaction_direction,
    p_attempt->>'requestedQuestionCount',(p_attempt->>'totalQuestions')::integer,
    (p_attempt->>'answeredCount')::integer,(p_attempt->>'correctCount')::integer,
    (p_attempt->>'wrongCount')::integer,0,(p_attempt->>'accuracy')::numeric,1,0,
    (p_attempt->>'bestCombo')::integer,p_attempt->>'rating',
    case when (p_attempt->>'completed')::boolean then 'completed'::public.speed_test_finish_reason
      else 'timed_out'::public.speed_test_finish_reason end,
    (p_attempt->>'scoringVersion')::integer,
    array(select jsonb_array_elements_text(p_attempt->'questionIds')),
    (p_attempt->>'startedAt')::timestamptz,(p_attempt->>'finishedAt')::timestamptz,
    false,null,reaction_game,p_attempt->>'mode',(p_attempt->>'score')::integer,
    (p_attempt->>'totalTimeMs')::integer,(p_attempt->>'livesRemaining')::integer,
    (p_attempt->>'perfectCount')::integer,(p_attempt->>'greatCount')::integer,
    (p_attempt->>'goodCount')::integer,(p_attempt->>'missCount')::integer,
    (p_attempt->>'gameOver')::boolean,(p_attempt->>'scoringVersion')::integer
  );

  for answer in select * from jsonb_array_elements(p_answers)
  loop
    insert into public.speed_test_answers (
      attempt_id,user_id,vocabulary_id,direction,prompt_snapshot,expected_answer_snapshot,
      user_answer,result,response_time_ms,position,time_before,time_after,question_id,
      question_type,example_id,reaction_grade,points_earned,streak_multiplier,
      difficulty_multiplier,audio_duration_ms,answer_window_ms
    ) values (
      attempt_id,actor_id,answer->>'vocabularyId',reaction_direction,answer->>'prompt',
      answer->>'expectedAnswer',coalesce(answer->>'userAnswer',''),
      (answer->>'result')::public.speed_test_result,(answer->>'reactionTimeMs')::integer,
      (answer->>'position')::integer,0,0,answer->>'questionId',answer->>'questionType',
      nullif(answer->>'exampleId',''),answer->>'grade',(answer->>'points')::integer,
      (answer->>'streakMultiplier')::numeric,(answer->>'difficulty')::numeric,
      nullif(answer->>'audioDurationMs','')::integer,(answer->>'answerWindowMs')::integer
    );

    insert into public.user_word_progress(user_id,vocabulary_id)
    values (actor_id,answer->>'vocabularyId')
    on conflict (user_id,vocabulary_id) do nothing;

    select * into progress from public.user_word_progress
    where user_id = actor_id and vocabulary_id = answer->>'vocabularyId' for update;
    attempts_count := progress.correct_count + progress.wrong_count + progress.near_miss_count + 1;
    mastery := round(100 * ((progress.correct_count + case when answer->>'result' = 'correct' then 1 else 0 end)::numeric / greatest(1, attempts_count)), 2);
    mastery_state := case
      when attempts_count < 2 then 'learning'::public.word_mastery_status
      when mastery >= 85 and attempts_count >= 5 then 'mastered'::public.word_mastery_status
      when mastery >= 65 and attempts_count >= 3 then 'familiar'::public.word_mastery_status
      else 'learning'::public.word_mastery_status
    end;

    update public.user_word_progress set
      correct_count = correct_count + case when answer->>'result' = 'correct' then 1 else 0 end,
      wrong_count = wrong_count + case when answer->>'result' = 'wrong' then 1 else 0 end,
      total_response_time_ms = total_response_time_ms + (answer->>'reactionTimeMs')::integer,
      average_response_time_ms = (total_response_time_ms + (answer->>'reactionTimeMs')::integer) / attempts_count,
      current_correct_streak = case when answer->>'result' = 'correct' then current_correct_streak + 1 else 0 end,
      mastery_score = mastery,
      mastery_status = mastery_state,
      last_seen_at = (p_attempt->>'finishedAt')::timestamptz,
      last_correct_at = case when answer->>'result' = 'correct' then (p_attempt->>'finishedAt')::timestamptz else last_correct_at end,
      last_wrong_at = case when answer->>'result' = 'wrong' then (p_attempt->>'finishedAt')::timestamptz else last_wrong_at end,
      updated_at = now()
    where user_id = actor_id and vocabulary_id = answer->>'vocabularyId';
  end loop;

  return jsonb_build_object('saved', true, 'attemptId', attempt_id);
end;
$$;

revoke all on function public.save_audio_reaction_result(jsonb,jsonb) from public;
grant execute on function public.save_audio_reaction_result(jsonb,jsonb) to authenticated;
