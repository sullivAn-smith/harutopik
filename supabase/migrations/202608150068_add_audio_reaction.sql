alter table public.speed_test_attempts
  add column if not exists source_kind text not null default 'list'
    check (source_kind in ('list', 'lesson')),
  add column if not exists source_id text not null default '',
  add column if not exists game_type text not null default 'typing_sprint'
    check (game_type in ('typing_sprint', 'audio_reaction')),
  add column if not exists answer_mode text
    check (answer_mode is null or answer_mode in ('choose', 'type')),
  add column if not exists score integer not null default 0 check (score >= 0),
  add column if not exists total_time_ms integer not null default 0 check (total_time_ms between 0 and 3600000),
  add column if not exists lives_remaining integer check (lives_remaining between 0 and 5),
  add column if not exists perfect_count integer not null default 0 check (perfect_count >= 0),
  add column if not exists great_count integer not null default 0 check (great_count >= 0),
  add column if not exists good_count integer not null default 0 check (good_count >= 0),
  add column if not exists miss_count integer not null default 0 check (miss_count >= 0),
  add column if not exists game_over boolean not null default false,
  add column if not exists scoring_version integer not null default 1 check (scoring_version > 0);

alter table public.speed_test_answers
  add column if not exists question_id text,
  add column if not exists question_type text
    check (question_type is null or question_type in ('word', 'sentence')),
  add column if not exists example_id text,
  add column if not exists reaction_grade text
    check (reaction_grade is null or reaction_grade in ('perfect', 'great', 'good', 'miss')),
  add column if not exists points_earned integer not null default 0 check (points_earned >= 0),
  add column if not exists streak_multiplier numeric(4,2) not null default 1 check (streak_multiplier >= 1),
  add column if not exists difficulty_multiplier numeric(4,2) not null default 1 check (difficulty_multiplier >= 1),
  add column if not exists audio_duration_ms integer check (audio_duration_ms is null or audio_duration_ms >= 0),
  add column if not exists answer_window_ms integer check (answer_window_ms is null or answer_window_ms between 1 and 60000);

alter table public.speed_test_answers
  drop constraint if exists speed_test_answers_attempt_id_vocabulary_id_key;

create index if not exists speed_test_audio_record_idx
  on public.speed_test_attempts (
    user_id, source_id, answer_mode, requested_question_count, score desc, total_time_ms asc
  )
  where game_type = 'audio_reaction';

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
begin
  if actor_id is null then raise exception 'UNAUTHENTICATED'; end if;
  if jsonb_typeof(p_answers) <> 'array' then raise exception 'INVALID_ANSWERS'; end if;
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
    attempt_id,actor_id,null,p_attempt->>'lessonName','lesson',p_attempt->>'lessonId','ko_vi',
    p_attempt->>'requestedQuestionCount',(p_attempt->>'totalQuestions')::integer,
    (p_attempt->>'answeredCount')::integer,(p_attempt->>'correctCount')::integer,
    (p_attempt->>'wrongCount')::integer,0,(p_attempt->>'accuracy')::numeric,1,0,
    (p_attempt->>'bestCombo')::integer,p_attempt->>'rating',
    case when (p_attempt->>'completed')::boolean then 'completed'::public.speed_test_finish_reason
      else 'timed_out'::public.speed_test_finish_reason end,
    (p_attempt->>'scoringVersion')::integer,
    array(select jsonb_array_elements_text(p_attempt->'questionIds')),
    (p_attempt->>'startedAt')::timestamptz,(p_attempt->>'finishedAt')::timestamptz,
    false,null,'audio_reaction',p_attempt->>'mode',(p_attempt->>'score')::integer,
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
      attempt_id,actor_id,answer->>'vocabularyId','ko_vi',answer->>'prompt',
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
    mastery := round(100 * (
      (progress.correct_count + case when answer->>'result' = 'correct' then 1 else 0 end)::numeric
      / greatest(1, attempts_count)
    ), 2);
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

create or replace function public.save_speed_test_result(
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
  daily_mode boolean := coalesce((p_attempt->>'isDaily')::boolean, false);
begin
  if actor_id is null then raise exception 'UNAUTHENTICATED'; end if;
  if jsonb_typeof(p_answers) <> 'array' then raise exception 'INVALID_ANSWERS'; end if;
  if exists (select 1 from public.speed_test_attempts where id = attempt_id) then
    raise exception 'ATTEMPT_EXISTS';
  end if;

  insert into public.speed_test_attempts (
    id,user_id,list_id,list_name,source_kind,source_id,direction,requested_question_count,total_questions,
    answered_count,correct_count,wrong_count,near_miss_count,accuracy,starting_seconds,
    remaining_seconds,best_combo,rating,finish_reason,rules_version,question_ids,
    started_at,finished_at,is_daily,challenge_date
  ) values (
    attempt_id,actor_id,nullif(p_attempt->>'listId','')::uuid,p_attempt->>'listName',
    p_attempt->>'sourceKind',p_attempt->>'sourceId',
    (p_attempt->>'direction')::public.speed_test_direction,p_attempt->>'requestedQuestionCount',
    (p_attempt->>'totalQuestions')::integer,(p_attempt->>'answeredCount')::integer,
    (p_attempt->>'correctCount')::integer,(p_attempt->>'wrongCount')::integer,
    (p_attempt->>'nearMissCount')::integer,(p_attempt->>'accuracy')::numeric,
    (p_attempt->>'startingSeconds')::integer,(p_attempt->>'remainingSeconds')::integer,
    (p_attempt->>'bestCombo')::integer,p_attempt->>'rating',
    (p_attempt->>'finishReason')::public.speed_test_finish_reason,
    (p_attempt->>'rulesVersion')::integer,
    array(select jsonb_array_elements_text(p_attempt->'questionIds')),
    (p_attempt->>'startedAt')::timestamptz,(p_attempt->>'finishedAt')::timestamptz,
    daily_mode,
    case when daily_mode then (p_attempt->>'challengeDate')::date else null end
  );

  for answer in select * from jsonb_array_elements(p_answers)
  loop
    insert into public.speed_test_answers (
      attempt_id,user_id,vocabulary_id,direction,prompt_snapshot,expected_answer_snapshot,
      user_answer,result,response_time_ms,position,time_before,time_after
    ) values (
      attempt_id,actor_id,answer->>'vocabularyId',
      (p_attempt->>'direction')::public.speed_test_direction,answer->>'prompt',
      answer->>'expectedAnswer',coalesce(answer->>'userAnswer',''),
      (answer->>'result')::public.speed_test_result,(answer->>'responseTimeMs')::integer,
      (answer->>'position')::integer,(answer->>'timeBefore')::integer,(answer->>'timeAfter')::integer
    );

    insert into public.user_word_progress(user_id,vocabulary_id)
    values (actor_id,answer->>'vocabularyId')
    on conflict (user_id,vocabulary_id) do nothing;

    select * into progress from public.user_word_progress
    where user_id = actor_id and vocabulary_id = answer->>'vocabularyId' for update;
    attempts_count := progress.correct_count + progress.wrong_count + progress.near_miss_count + 1;
    mastery := round(100 * (
      (progress.correct_count + case when answer->>'result' = 'correct' then 1 else 0 end)::numeric
      / greatest(1, attempts_count)
    ), 2);
    mastery_state := case
      when attempts_count < 2 then 'learning'::public.word_mastery_status
      when mastery >= 85 and attempts_count >= 5 then 'mastered'::public.word_mastery_status
      when mastery >= 65 and attempts_count >= 3 then 'familiar'::public.word_mastery_status
      else 'learning'::public.word_mastery_status
    end;

    update public.user_word_progress set
      correct_count = correct_count + case when answer->>'result' = 'correct' then 1 else 0 end,
      wrong_count = wrong_count + case when answer->>'result' = 'wrong' then 1 else 0 end,
      near_miss_count = near_miss_count + case when answer->>'result' = 'near_miss' then 1 else 0 end,
      total_response_time_ms = total_response_time_ms + (answer->>'responseTimeMs')::integer,
      average_response_time_ms = (total_response_time_ms + (answer->>'responseTimeMs')::integer) / attempts_count,
      current_correct_streak = case when answer->>'result' = 'correct' then current_correct_streak + 1 else 0 end,
      mastery_score = mastery,
      mastery_status = mastery_state,
      last_seen_at = (p_attempt->>'finishedAt')::timestamptz,
      last_correct_at = case when answer->>'result' = 'correct' then (p_attempt->>'finishedAt')::timestamptz else last_correct_at end,
      last_wrong_at = case when answer->>'result' <> 'correct' then (p_attempt->>'finishedAt')::timestamptz else last_wrong_at end,
      updated_at = now()
    where user_id = actor_id and vocabulary_id = answer->>'vocabularyId';
  end loop;

  return jsonb_build_object('saved', true, 'attemptId', attempt_id);
end;
$$;

revoke all on function public.save_speed_test_result(jsonb,jsonb) from public;
grant execute on function public.save_speed_test_result(jsonb,jsonb) to authenticated;
