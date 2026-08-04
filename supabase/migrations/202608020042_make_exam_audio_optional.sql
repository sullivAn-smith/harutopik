create or replace function public.submit_exam_for_review(p_exam_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  target public.exam_sets;
  listening_count integer;
  reading_count integer;
  invalid_count integer;
begin
  select * into target from public.exam_sets where id = p_exam_id for update;
  if target.id is null then raise exception 'EXAM_NOT_FOUND'; end if;
  if target.created_by <> auth.uid() and not public.has_app_role(array['admin']::public.app_role[]) then raise exception 'FORBIDDEN'; end if;
  if target.status not in ('draft','changes_requested') then raise exception 'INVALID_STATUS'; end if;

  select
    count(*) filter (where section = 'listening'),
    count(*) filter (where section = 'reading'),
    count(*) filter (where jsonb_array_length(options) <> 4)
  into listening_count, reading_count, invalid_count
  from public.exam_questions where exam_id = p_exam_id;

  if listening_count = 0 or reading_count = 0 or invalid_count > 0 then
    raise exception 'EXAM_NOT_READY';
  end if;
  update public.exam_sets set status = 'pending_review', updated_at = now() where id = p_exam_id;
end $$;

create or replace function public.hotfix_published_exam(p_exam_id uuid, p_exam jsonb, p_questions jsonb, p_reason text)
returns integer language plpgsql security definer set search_path = public as $$
declare
  target public.exam_sets;
  question jsonb;
  next_version integer;
begin
  if not public.has_app_role(array['admin']::public.app_role[]) then raise exception 'FORBIDDEN'; end if;
  if nullif(trim(p_reason), '') is null then raise exception 'HOTFIX_REASON_REQUIRED'; end if;
  select * into target from public.exam_sets where id = p_exam_id for update;
  if target.id is null then raise exception 'EXAM_NOT_FOUND'; end if;
  if target.status <> 'published' then raise exception 'INVALID_STATUS'; end if;
  if not exists (select 1 from jsonb_array_elements(p_questions) q where q->>'section' = 'listening')
    or not exists (select 1 from jsonb_array_elements(p_questions) q where q->>'section' = 'reading') then
    raise exception 'EXAM_NOT_READY';
  end if;

  next_version := target.version + 1;
  update public.exam_sets set
    code = trim(p_exam->>'code'), title = trim(p_exam->>'title'),
    description = coalesce(trim(p_exam->>'description'), ''),
    listening_duration_minutes = (p_exam->>'listeningDurationMinutes')::integer,
    reading_duration_minutes = (p_exam->>'readingDurationMinutes')::integer,
    duration_minutes = (p_exam->>'listeningDurationMinutes')::integer + (p_exam->>'readingDurationMinutes')::integer,
    instructions = coalesce(trim(p_exam->>'instructions'), ''),
    version = next_version, updated_at = now()
  where id = p_exam_id;
  delete from public.exam_questions where exam_id = p_exam_id;
  for question in select value from jsonb_array_elements(p_questions) loop
    insert into public.exam_questions(exam_id,position,section,instruction,prompt,audio_url,audio_text,image_url,play_limit,options,correct_option,explanation)
    values (p_exam_id,(question->>'position')::integer,question->>'section',coalesce(trim(question->>'instruction'),''),coalesce(trim(question->>'prompt'),''),nullif(trim(question->>'audioUrl'),''),nullif(trim(question->>'audioText'),''),nullif(trim(question->>'imageUrl'),''),1,question->'options',(question->>'correctOption')::smallint,coalesce(trim(question->>'explanation'),''));
  end loop;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
  values (auth.uid(),'exam.hotfix_applied','exam',p_exam_id::text,jsonb_build_object('previous_version',target.version,'version',next_version,'reason',trim(p_reason)));
  return next_version;
end $$;

grant execute on function public.submit_exam_for_review(uuid) to authenticated;
grant execute on function public.hotfix_published_exam(uuid,jsonb,jsonb,text) to authenticated;
