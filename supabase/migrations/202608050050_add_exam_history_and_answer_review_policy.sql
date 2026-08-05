alter table public.exam_sets
  add column if not exists answer_review_policy text not null default 'immediate',
  add column if not exists answer_review_available_at timestamptz;

alter table public.exam_sets drop constraint if exists exam_sets_answer_review_policy_check;
alter table public.exam_sets add constraint exam_sets_answer_review_policy_check
  check (answer_review_policy in ('immediate', 'score_only', 'after_date', 'never'));

alter table public.exam_sets drop constraint if exists exam_sets_answer_review_date_check;
alter table public.exam_sets add constraint exam_sets_answer_review_date_check
  check (answer_review_policy <> 'after_date' or answer_review_available_at is not null);

create index if not exists exam_attempts_user_exam_completed_idx
  on public.exam_attempts(user_id, exam_id, submitted_at desc)
  where status in ('submitted', 'expired');

create or replace function public.get_exam_history_summary(p_user_id uuid)
returns table(
  exam_id uuid,
  code text,
  title text,
  level text,
  attempt_count bigint,
  best_score integer,
  best_max_score integer,
  last_attempt_at timestamptz,
  last_attempt_id uuid
)
language sql
stable
security definer
set search_path = public
as $$
  with completed as (
    select
      attempt.id,
      attempt.exam_id,
      coalesce(attempt.score, 0) as score,
      case when attempt.attempt_mode = 'full' then 200 else 100 end as max_score,
      coalesce(attempt.submitted_at, attempt.started_at) as finished_at
    from public.exam_attempts attempt
    where attempt.user_id = p_user_id
      and attempt.status in ('submitted', 'expired')
  ),
  stats as (
    select completed.exam_id, count(*) as attempt_count, max(completed.finished_at) as last_attempt_at
    from completed
    group by completed.exam_id
  ),
  best as (
    select distinct on (completed.exam_id)
      completed.exam_id,
      completed.score,
      completed.max_score
    from completed
    order by completed.exam_id,
      completed.score::numeric / nullif(completed.max_score, 0) desc,
      completed.finished_at desc
  ),
  recent as (
    select distinct on (completed.exam_id)
      completed.exam_id,
      completed.id
    from completed
    order by completed.exam_id, completed.finished_at desc
  )
  select
    exam.id,
    exam.code,
    exam.title,
    exam.level,
    stats.attempt_count,
    best.score,
    best.max_score,
    stats.last_attempt_at,
    recent.id
  from stats
  join public.exam_sets exam on exam.id = stats.exam_id
  join best on best.exam_id = stats.exam_id
  join recent on recent.exam_id = stats.exam_id
  order by stats.last_attempt_at desc;
$$;

revoke all on function public.get_exam_history_summary(uuid) from public, anon, authenticated;
grant execute on function public.get_exam_history_summary(uuid) to service_role;

create or replace function public.save_exam_draft(p_exam_id uuid, p_exam jsonb, p_questions jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare target public.exam_sets; question jsonb;
begin
  select * into target from public.exam_sets where id = p_exam_id for update;
  if target.id is null then raise exception 'EXAM_NOT_FOUND'; end if;
  if target.created_by <> auth.uid() and not public.has_app_role(array['admin']::public.app_role[]) then raise exception 'FORBIDDEN'; end if;
  if target.status not in ('draft','changes_requested') and not public.has_app_role(array['admin']::public.app_role[]) then raise exception 'INVALID_STATUS'; end if;
  update public.exam_sets set
    code=trim(p_exam->>'code'), title=trim(p_exam->>'title'), description=coalesce(trim(p_exam->>'description'),''),
    level=case when p_exam->>'level' in ('topik_i','topik_ii') then p_exam->>'level' else target.level end,
    answer_review_policy=coalesce(nullif(p_exam->>'answerReviewPolicy',''), 'immediate'),
    answer_review_available_at=case when p_exam->>'answerReviewPolicy'='after_date' then (p_exam->>'answerReviewAvailableAt')::timestamptz else null end,
    duration_minutes=(p_exam->>'listeningDurationMinutes')::integer+(p_exam->>'readingDurationMinutes')::integer,
    listening_duration_minutes=(p_exam->>'listeningDurationMinutes')::integer,
    reading_duration_minutes=(p_exam->>'readingDurationMinutes')::integer,
    instructions=coalesce(trim(p_exam->>'instructions'),''), updated_at=now()
  where id=p_exam_id;
  delete from public.exam_questions where exam_id=p_exam_id;
  for question in select value from jsonb_array_elements(coalesce(p_questions,'[]'::jsonb)) loop
    insert into public.exam_questions(
      exam_id,position,section,audio_block_key,answer_type,instruction,prompt,audio_url,audio_text,
      image_url,play_limit,options,option_images,correct_option,explanation
    ) values (
      p_exam_id,(question->>'position')::integer,question->>'section',nullif(trim(question->>'audioBlockKey'),''),
      coalesce(nullif(question->>'answerType',''),'text'),coalesce(trim(question->>'instruction'),''),
      coalesce(trim(question->>'prompt'),''),nullif(trim(question->>'audioUrl'),''),nullif(trim(question->>'audioText'),''),
      nullif(trim(question->>'imageUrl'),''),1,question->'options',coalesce(question->'optionImages','["", "", "", ""]'::jsonb),
      (question->>'correctOption')::smallint,coalesce(trim(question->>'explanation'),'')
    );
  end loop;
end $$;

create or replace function public.hotfix_published_exam(p_exam_id uuid, p_exam jsonb, p_questions jsonb, p_reason text)
returns integer language plpgsql security definer set search_path = public as $$
declare target public.exam_sets; question jsonb; next_version integer;
begin
  if not public.has_app_role(array['admin']::public.app_role[]) then raise exception 'FORBIDDEN'; end if;
  if nullif(trim(p_reason),'') is null then raise exception 'HOTFIX_REASON_REQUIRED'; end if;
  select * into target from public.exam_sets where id=p_exam_id for update;
  if target.id is null then raise exception 'EXAM_NOT_FOUND'; end if;
  if target.status <> 'published' then raise exception 'INVALID_STATUS'; end if;
  if not exists(select 1 from jsonb_array_elements(p_questions) q where q->>'section'='listening')
    or not exists(select 1 from jsonb_array_elements(p_questions) q where q->>'section'='reading') then raise exception 'EXAM_NOT_READY'; end if;
  next_version:=target.version+1;
  update public.exam_sets set
    code=trim(p_exam->>'code'),title=trim(p_exam->>'title'),description=coalesce(trim(p_exam->>'description'),''),
    level=case when p_exam->>'level' in ('topik_i','topik_ii') then p_exam->>'level' else target.level end,
    answer_review_policy=coalesce(nullif(p_exam->>'answerReviewPolicy',''), 'immediate'),
    answer_review_available_at=case when p_exam->>'answerReviewPolicy'='after_date' then (p_exam->>'answerReviewAvailableAt')::timestamptz else null end,
    listening_duration_minutes=(p_exam->>'listeningDurationMinutes')::integer,
    reading_duration_minutes=(p_exam->>'readingDurationMinutes')::integer,
    duration_minutes=(p_exam->>'listeningDurationMinutes')::integer+(p_exam->>'readingDurationMinutes')::integer,
    instructions=coalesce(trim(p_exam->>'instructions'),''),version=next_version,updated_at=now()
  where id=p_exam_id;
  delete from public.exam_questions where exam_id=p_exam_id;
  for question in select value from jsonb_array_elements(p_questions) loop
    insert into public.exam_questions(
      exam_id,position,section,audio_block_key,answer_type,instruction,prompt,audio_url,audio_text,
      image_url,play_limit,options,option_images,correct_option,explanation
    ) values (
      p_exam_id,(question->>'position')::integer,question->>'section',nullif(trim(question->>'audioBlockKey'),''),
      coalesce(nullif(question->>'answerType',''),'text'),coalesce(trim(question->>'instruction'),''),
      coalesce(trim(question->>'prompt'),''),nullif(trim(question->>'audioUrl'),''),nullif(trim(question->>'audioText'),''),
      nullif(trim(question->>'imageUrl'),''),1,question->'options',coalesce(question->'optionImages','["", "", "", ""]'::jsonb),
      (question->>'correctOption')::smallint,coalesce(trim(question->>'explanation'),'')
    );
  end loop;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),'exam.hotfix_applied','exam',p_exam_id::text,jsonb_build_object('previous_version',target.version,'version',next_version,'reason',trim(p_reason)));
  return next_version;
end $$;

grant execute on function public.save_exam_draft(uuid,jsonb,jsonb) to authenticated;
grant execute on function public.hotfix_published_exam(uuid,jsonb,jsonb,text) to authenticated;
